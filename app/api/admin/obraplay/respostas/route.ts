// route – admin/obraplay/respostas  (spec v2 – /auth/users/quotation_answers/)
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

function extractId(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === "number") return v
  if (typeof v === "string") return parseInt(v, 10) || null
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    if (o.id != null) return Number(o.id) || null
  }
  return null
}

/** Calcula o subtotal de uma resposta somando os itens disponíveis (em micros ÷ 1M) */
function calcSubtotal(answered_items: any[]): number {
  if (!Array.isArray(answered_items)) return 0
  return answered_items
    .filter(i => i.available === true)
    .reduce((acc, i) => {
      const price = Number(i.unit_price_micros ?? 0) / 1_000_000
      const qty   = Number(i.total_quantity_micros ?? 0) / 1_000_000
      return acc + price * qty
    }, 0)
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { searchParams } = new URL(req.url)
  const q        = searchParams.get("q")       ?? ""
  const daysRaw  = searchParams.get("days")
  const days     = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1))
  const sortParam = searchParams.get("sort") ?? ""
  const sortDir   = searchParams.get("dir")  ?? "desc"
  const statusFilter = searchParams.get("status") ?? ""
  const tipoFilter   = searchParams.get("tipo")   ?? ""  // "marketplace" | "proprio"

  const ORDER_MAP: Record<string, string> = {
    answered_at:   "published_at",
    supplier_name: "company__short_name",
    valid_until:   "valid_until",
  }
  const ordering = sortParam && ORDER_MAP[sortParam]
    ? `${sortDir === "asc" ? "" : "-"}${ORDER_MAP[sortParam]}`
    : "-published_at"

  // Mapeia filtro de tipo para parâmetro autofilled
  let autofilledParam: boolean | undefined = undefined
  if (tipoFilter === "marketplace") autofilledParam = false
  if (tipoFilter === "proprio")     autofilledParam = true

  // Mapeia filtro de status para parâmetros booleanos da API
  let isAnswered: boolean | undefined  = undefined
  let isPending:  boolean | undefined  = undefined
  let isExpired:  boolean | undefined  = undefined
  let isConverted: boolean | undefined = undefined
  if (statusFilter === "Respondida")  isAnswered  = true
  if (statusFilter === "Em aberto")   isPending   = true
  if (statusFilter === "Expirada")    isExpired   = true
  if (statusFilter === "Convertida")  isConverted = true

  const baseParams = {
    page,
    page_size: 20,
    ordering,
    ...(q ? { search: q } : {}),
    ...(autofilledParam  != null ? { autofilled:   autofilledParam }  : {}),
    ...(isAnswered       != null ? { is_answered:  isAnswered }       : {}),
    ...(isPending        != null ? { is_pending:   isPending }        : {}),
    ...(isExpired        != null ? { is_expired:   isExpired }        : {}),
    ...(isConverted      != null ? { is_converted: isConverted }      : {}),
  }

  let opResult: { results: any[]; count: number } = { results: [], count: 0 }
  let opError: string | null = null

  try {
    opResult = await obraplay.quotations.listAnswers({
      ...baseParams,
      published_at__gte: cutoffDate(days),
    })
  } catch (e: any) {
    console.error("[respostas] API error (with date filter):", e?.message)
    try {
      opResult = await obraplay.quotations.listAnswers(baseParams)
      opError = "Filtro de período ignorado (parâmetro não suportado pela API)"
    } catch (e2: any) {
      console.error("[respostas] API error (without date filter):", e2?.message)
      return NextResponse.json(
        { error: "Falha ao buscar respostas na API ObraPlay", detail: e2?.message, rows: [], total: 0 },
        { status: 502 }
      )
    }
  }

  const opRows: any[] = opResult.results ?? []
  const total: number = opResult.count ?? 0

  // Enriquece com dados locais via obraplay_quotation_id
  const opQuotationIds = [...new Set(
    opRows
      .map(r => extractId(r.quotation))
      .filter((id): id is number => id != null)
  )]

  const db = neon(process.env.DATABASE_URL!)

  type LocalQuotation = {
    company_name: string
    cotacao_id: string
    cotacao_identifier: string
    requester_name: string | null
    requester_email: string | null
    requester_phone: string | null
    obra_name: string | null
    item_count: number
  }

  let quotationMap: Record<number, LocalQuotation> = {}

  if (opQuotationIds.length > 0) {
    try {
      const placeholders = opQuotationIds.map((_, i) => `$${i + 1}`).join(",")
      const local = await db.query(
        `SELECT
           c.id,
           c.obraplay_quotation_id,
           c.identifier,
           c.requester_name,
           c.requester_email,
           c.requester_phone,
           co.fantasy_name   AS company_name,
           co.phone_primary  AS company_phone,
           co.email          AS company_email,
           o.name            AS obra_name,
           COUNT(ci.id)::int AS item_count
         FROM cotacoes c
         LEFT JOIN companies     co ON co.id = c.company_id
         LEFT JOIN obras          o  ON o.id  = c.obra_id
         LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
         WHERE c.obraplay_quotation_id = ANY(ARRAY[${placeholders}]::int[])
         GROUP BY c.id, c.obraplay_quotation_id, c.identifier,
                  c.requester_name, c.requester_email, c.requester_phone,
                  co.fantasy_name, co.phone_primary, co.email, o.name`,
        opQuotationIds
      )
      for (const row of local) {
        quotationMap[row.obraplay_quotation_id] = {
          company_name:       row.company_name     ?? "—",
          cotacao_id:         row.id,
          cotacao_identifier: row.identifier,
          requester_name:     row.requester_name   ?? null,
          requester_email:    row.requester_email  ?? row.company_email ?? null,
          requester_phone:    row.requester_phone  ?? row.company_phone ?? null,
          obra_name:          row.obra_name         ?? null,
          item_count:         row.item_count        ?? 0,
        }
      }
    } catch (dbErr: any) {
      console.error("[respostas] DB enrich error:", dbErr?.message)
    }
  }

  const rows = opRows.map(r => {
    const quotationId  = extractId(r.quotation)
    const quotationObj = (typeof r.quotation === "object" && r.quotation != null)
      ? (r.quotation as Record<string, any>)
      : null
    const local = quotationId != null ? (quotationMap[quotationId] ?? null) : null

    // BUG 1 fix — cotação: quotation é OBJETO → usar quotationObj.code
    const cotacaoCode = quotationObj?.code != null ? String(quotationObj.code) : null

    // BUG 2 fix — fornecedor: usar item.company (objeto) → short_name ?? full_name
    const companyObj = (typeof r.company === "object" && r.company != null)
      ? (r.company as Record<string, any>)
      : null
    const supplierName = companyObj
      ? String(companyObj.short_name ?? companyObj.full_name ?? companyObj.display_name ?? "—")
      : (scalar(r.company) ?? "—")

    // BUG 3 fix — pagamento: payment_method é OBJETO → usar .name
    const pmObj = (typeof r.payment_method === "object" && r.payment_method != null)
      ? (r.payment_method as Record<string, any>)
      : null
    const paymentMethod = pmObj
      ? String(pmObj.name ?? pmObj.code ?? "—")
      : (scalar(r.payment_method) ?? null)

    // BUG 4 fix — itens: filtrar answered_items por available === true
    const answeredItems: any[] = Array.isArray(r.answered_items) ? r.answered_items : []
    const availableItems = answeredItems.filter((i: any) => i.available === true)
    const itemCount      = availableItems.length

    // BUG 5 fix — valor: somar (unit_price_micros/1M) * (total_quantity_micros/1M) dos disponíveis
    const subtotal = calcSubtotal(answeredItems)

    // Status baseado em answered_at
    const answeredAt = scalar(r.answered_at) ?? scalar(r.published_at) ?? null
    const status     = answeredAt ? "Respondida" : "Em aberto"

    // Tipo: own_supplier === false → Marketplace, true → Próprio (filtro usa autofilled mas campo é own_supplier)
    const tipo = r.own_supplier === true ? "Próprio" : "Marketplace"

    // Solicitante
    const requesterName  = scalar(r.name)  ?? local?.requester_name  ?? null
    const requesterEmail = scalar(r.email) ?? local?.requester_email ?? null
    const requesterPhone = scalar(r.phone) ?? local?.requester_phone ?? null
    const city  = scalar(r.city)  ?? null
    const state = scalar(r.state) ?? null

    return {
      op_answer_id:         r.id,
      quotation_id:         quotationId,
      quotation_code:       cotacaoCode,
      cotacao_id:           local?.cotacao_id           ?? null,
      cotacao_identifier:   local?.cotacao_identifier   ?? cotacaoCode ?? (quotationId ? `OP #${quotationId}` : "—"),
      // Solicitante (construtor)
      company_name:         local?.company_name         ?? "—",
      requester_name:       requesterName,
      requester_email:      requesterEmail,
      requester_phone:      requesterPhone,
      city,
      state,
      obra_name:            local?.obra_name             ?? null,
      items_from_quotation: local?.item_count            ?? (quotationObj?.items_count ?? null),
      // Fornecedor (BUG 2 corrigido)
      supplier_name:        supplierName,
      supplier_email:       scalar(companyObj?.email)   ?? null,
      supplier_phone:       scalar(companyObj?.phone)   ?? null,
      supplier_foreign_id:  companyObj?.id              ?? null,
      // Condições (BUG 3 corrigido)
      payment_method:       paymentMethod,
      answered_at:          answeredAt,
      valid_until:          scalar(r.valid_until)        ?? null,
      // Itens e valor (BUG 4 e 5 corrigidos)
      item_count:           itemCount,
      subtotal:             subtotal > 0 ? subtotal : null,
      tipo,
      status,
      observations:         scalar(r.observations)      ?? null,
    }
  })

  return NextResponse.json({
    rows,
    total,
    page,
    per: 20,
    days: days ?? "todos",
    _warning: opError,
  })
}
