// route – admin/obraplay/ordens  (spec v2 – /auth/users/orders/)
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { obraplay } from "@/lib/obraplay-client"

function cutoffDate(days: number | null): string | undefined {
  if (!days) return undefined
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0]
}

function toStr(val: unknown): string {
  if (val == null) return ""
  if (typeof val === "string") return val
  if (typeof val === "number") return String(val)
  if (typeof val === "object") {
    const o = val as Record<string, unknown>
    if (o.code != null) return String(o.code)
    if (o.name != null) return String(o.name)
    if (o.id   != null) return String(o.id)
    return ""
  }
  return String(val)
}

function scalar(v: unknown): string | null {
  const s = toStr(v)
  return s.length > 0 ? s : null
}

/** Calcula o total de uma OC a partir dos itens retornados por /auth/users/order_items/?order={id} */
function calcOrderTotal(items: any[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0
  return items.reduce((acc, item) => {
    const price    = Number(item.unit_price_micros    ?? 0) / 1_000_000
    const qty      = Number(item.total_quantity_micros ?? 0) / 1_000_000
    const discount = Number(item.total_discount_micros ?? 0) / 1_000_000
    return acc + (price * qty) - discount
  }, 0)
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { searchParams } = new URL(req.url)
  const q        = searchParams.get("q")        ?? ""
  const syncErr  = searchParams.get("sync_err") ?? ""
  const daysRaw  = searchParams.get("days")
  const days     = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1))
  const sortParam = searchParams.get("sort") ?? ""
  const sortDir   = searchParams.get("dir")  ?? "desc"

  const ORDER_MAP: Record<string, string> = {
    created_at:          "created_at",
    supplier_name:       "supplier_name",
    obraplay_order_code: "code",
  }
  const ordering = sortParam && ORDER_MAP[sortParam]
    ? `${sortDir === "asc" ? "" : "-"}${ORDER_MAP[sortParam]}`
    : "-created_at"

  const baseParams = {
    page,
    page_size: 20,
    ordering,
    ...(q ? { search: q } : {}),
  }

  let opResult: { results: any[]; count: number } = { results: [], count: 0 }
  let opError: string | null = null

  try {
    opResult = await obraplay.orders.list({
      ...baseParams,
      created_at__gte: cutoffDate(days),
    })
  } catch (e: any) {
    console.error("[ordens] API error (with date filter):", e?.message)
    try {
      opResult = await obraplay.orders.list(baseParams)
      opError = "Filtro de período ignorado (parâmetro não suportado pela API)"
    } catch (e2: any) {
      console.error("[ordens] API error (without date filter):", e2?.message)
      return NextResponse.json(
        { error: "Falha ao buscar ordens na API ObraPlay", detail: e2?.message, rows: [], total: 0 },
        { status: 502 }
      )
    }
  }

  const opRows: any[]  = opResult.results ?? []
  const total: number  = opResult.count   ?? 0

  // Busca itens de cada OC em paralelo para calcular o total (Opção B da spec)
  const orderTotals: Record<number, number> = {}
  if (opRows.length > 0) {
    const itemResults = await Promise.allSettled(
      opRows.map(o => obraplay.orders.listItems(o.id))
    )
    itemResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        orderTotals[opRows[idx].id] = calcOrderTotal(result.value)
      }
    })
  }

  // Enriquece com dados locais pelo obraplay_order_code
  const db = neon(process.env.DATABASE_URL!)
  const opCodes = opRows.map(r => r.code).filter(Boolean)
  let localMap: Record<string, {
    company_name: string
    cotacao_identifier: string | null
    local_id: string
    obraplay_sync_error: string | null
    status: string | null
  }> = {}

  if (opCodes.length > 0) {
    try {
      const placeholders = opCodes.map((_, i) => `$${i + 1}`).join(",")
      const local = await db.query(
        `SELECT oc.id AS local_id, oc.obraplay_order_code, oc.obraplay_sync_error, oc.status,
                c.identifier AS cotacao_identifier,
                co.fantasy_name AS company_name
         FROM ordens_compra oc
         LEFT JOIN cotacoes  c  ON c.id  = oc.cotacao_id
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE oc.obraplay_order_code = ANY(ARRAY[${placeholders}])`,
        opCodes
      )
      for (const row of local) {
        if (row.obraplay_order_code) localMap[row.obraplay_order_code] = row
      }
    } catch (dbErr: any) {
      console.error("[ordens] DB enrich error:", dbErr?.message)
    }
  }

  let rows = opRows.map(o => {
    const local    = localMap[o.code] ?? null
    const totalVal = orderTotals[o.id] ?? null

    // BUG 1 fix — empresa: order.company é OBJETO → usar short_name ?? full_name
    const companyObj = (typeof o.company === "object" && o.company != null)
      ? (o.company as Record<string, any>)
      : null
    const companyName = companyObj
      ? String(companyObj.short_name ?? companyObj.full_name ?? companyObj.display_name ?? "—")
      : (local?.company_name ?? scalar(o.name) ?? "—")

    // BUG 2 fix — cotação: usar quotation_code (campo readOnly), NÃO quotation_answer (só é ID)
    const quotationCode = scalar(o.quotation_code) ?? local?.cotacao_identifier ?? null

    // BUG 3 fix — status: derivar das datas na ordem especificada
    let status: string
    if (o.canceled_at)   status = "Cancelada"
    else if (o.refused_at)    status = "Recusada"
    else if (o.finalized_at)  status = "Finalizada"
    else if (o.processed_at)  status = "Em processamento"
    else                      status = "Pendente"

    // BUG 4 — total calculado via order_items (já feito via Promise.allSettled acima)
    // totalVal já tem o valor correto calculado por calcOrderTotal

    return {
      id:                   o.id,
      obraplay_order_code:  scalar(o.code)             ?? null,
      key:                  scalar(o.key)               ?? null,
      frontend_url:         scalar(o.frontend_url)      ?? null,
      status,
      // BUG 1: empresa pelo objeto
      company_name:         companyName,
      requester_name:       scalar(o.name)              ?? null,
      requester_email:      scalar(o.email)             ?? null,
      requester_phone:      scalar(o.phone)             ?? null,
      // Fornecedor
      supplier_name:        scalar(o.supplier_name)     ?? "—",
      supplier_email:       scalar(o.supplier_email)    ?? null,
      supplier_phone:       scalar(o.supplier_phone)    ?? null,
      // BUG 2: cotação pelo quotation_code
      quotation_answer:     o.quotation_answer           ?? null,
      quotation_code:       quotationCode,
      cotacao_identifier:   local?.cotacao_identifier    ?? null,
      local_id:             local?.local_id              ?? null,
      // Condições
      payment_method:       scalar(o.payment_method)    ?? null,
      installments:         scalar(o.installments)      ?? null,
      arrival_estimate:     scalar(o.arrival_estimate)  ?? null,
      created_at:           scalar(o.created_at)        ?? null,
      // BUG 3: status por datas / BUG 4: total por order_items
      total:                totalVal,
      obraplay_sync_error:  local?.obraplay_sync_error  ?? null,
    }
  })

  if (syncErr === "yes") {
    rows = rows.filter(r => r.obraplay_sync_error)
  }

  return NextResponse.json({
    rows,
    total,
    page,
    per: 20,
    days: days ?? "todos",
    _warning: opError,
  })
}
