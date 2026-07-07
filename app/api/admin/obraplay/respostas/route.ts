// route – admin/obraplay/respostas
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

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { searchParams } = new URL(req.url)
  const q       = searchParams.get("q")    ?? ""
  const daysRaw = searchParams.get("days")
  const days    = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page    = Math.max(1, Number(searchParams.get("page") ?? 1))
  const sortParam = searchParams.get("sort") ?? ""
  const sortDir   = searchParams.get("dir")  ?? "desc"

  const ORDER_MAP: Record<string, string> = {
    answered_at:    "answered_at",
    supplier_name:  "supplier__short_name",
    payment_method: "payment_method",
  }
  const ordering = sortParam && ORDER_MAP[sortParam]
    ? `${sortDir === "asc" ? "" : "-"}${ORDER_MAP[sortParam]}`
    : "-answered_at"

  const baseParams = {
    search:    q || undefined,
    page,
    page_size: 50,
    ordering,
  }

  let opResult: { results: any[]; count: number } = { results: [], count: 0 }
  let opError: string | null = null

  try {
    opResult = await obraplay.quotations.listAnswers({
      ...baseParams,
      answered_at__gte: cutoffDate(days),
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
         LEFT JOIN companies co ON co.id = c.company_id
         LEFT JOIN obras      o  ON o.id  = c.obra_id
         LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
         WHERE c.obraplay_quotation_id = ANY(ARRAY[${placeholders}]::int[])
         GROUP BY c.id, c.obraplay_quotation_id, c.identifier,
                  c.requester_name, c.requester_email, c.requester_phone,
                  co.fantasy_name, co.phone_primary, co.email, o.name`,
        opQuotationIds
      )
      for (const row of local) {
        quotationMap[row.obraplay_quotation_id] = {
          company_name:       row.company_name    ?? "—",
          cotacao_id:         row.id,
          cotacao_identifier: row.identifier,
          requester_name:     row.requester_name  ?? null,
          requester_email:    row.requester_email ?? row.company_email ?? null,
          requester_phone:    row.requester_phone ?? row.company_phone ?? null,
          obra_name:          row.obra_name        ?? null,
          item_count:         row.item_count       ?? 0,
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

    const answered_at = scalar(r.answered_at) ?? null
    const status      = answered_at ? "Respondida" : "Em aberto"

    const supplierRaw = r.supplier != null
      ? (r.supplier.display_name ?? r.supplier.full_name ?? r.supplier.short_name ?? null)
      : (r.supplier_name ?? null)
    const supplierName = scalar(supplierRaw) ?? "—"

    const companyRaw = quotationObj?.company != null
      ? (quotationObj.company.display_name ?? quotationObj.company.short_name ?? null)
      : null
    const companyName = local?.company_name ?? scalar(companyRaw) ?? "—"

    const quotationIdDisplay = quotationId != null ? `OP #${quotationId}` : "—"

    return {
      op_answer_id:         r.id,
      quotation_id:         quotationId,
      quotation_code:       scalar(quotationObj?.code) ?? scalar(r.quotation_code) ?? null,
      cotacao_id:           local?.cotacao_id            ?? null,
      cotacao_identifier:   local?.cotacao_identifier    ?? scalar(quotationObj?.code) ?? quotationIdDisplay,
      company_name:         companyName,
      requester_name:       local?.requester_name        ?? scalar(quotationObj?.creator?.name) ?? null,
      requester_email:      local?.requester_email       ?? null,
      requester_phone:      local?.requester_phone       ?? null,
      obra_name:            local?.obra_name              ?? scalar(quotationObj?.name) ?? null,
      items_from_quotation: local?.item_count             ?? (typeof quotationObj?.items_count === "number" ? quotationObj.items_count : null),
      supplier_name:        supplierName,
      supplier_city:        scalar(r.supplier?.city)     ?? null,
      supplier_email:       scalar(r.supplier_email)     ?? scalar(r.supplier?.email) ?? null,
      supplier_foreign_id:  r.supplier?.id               ?? null,
      payment_method:       scalar(r.payment_method)     ?? null,
      arrival_estimate:     scalar(r.arrival_estimate)   ?? null,
      valid_until:          scalar(r.valid_until)        ?? null,
      answered_at,
      status,
      item_count:           Array.isArray(r.answered_items) ? r.answered_items.length : (r.items_count ?? 0),
      observations:         scalar(r.observations)       ?? null,
    }
  })

  return NextResponse.json({ rows, total, page, per: 50, days: days ?? "todos", _warning: opError })
}
