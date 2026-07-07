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

  // Busca respostas de cotação na API ObraPlay
  const opResult = await obraplay.quotations.listAnswers({
    search:              q || undefined,
    page,
    page_size:           50,
    answered_at__gte:    cutoffDate(days),
    ordering,
  })

  const opRows: any[] = opResult.results ?? []
  const total: number = opResult.count   ?? 0

  // Enriquece com empresa local pelo obraplay_quotation_id
  const opQuotationIds = [...new Set(opRows.map(r => r.quotation).filter(Boolean))]

  const db = neon(process.env.DATABASE_URL!)
  let quotationMap: Record<number, { company_name: string; cotacao_id: string; cotacao_identifier: string }> = {}

  if (opQuotationIds.length > 0) {
    const placeholders = opQuotationIds.map((_, i) => `$${i + 1}`).join(",")
    const local = await db.query(
      `SELECT c.id, c.obraplay_quotation_id, c.identifier,
              co.fantasy_name AS company_name
       FROM cotacoes c
       LEFT JOIN companies co ON co.id = c.company_id
       WHERE c.obraplay_quotation_id = ANY(ARRAY[${placeholders}]::int[])`,
      opQuotationIds
    )
    for (const row of local) {
      quotationMap[row.obraplay_quotation_id] = {
        company_name:       row.company_name,
        cotacao_id:         row.id,
        cotacao_identifier: row.identifier,
      }
    }
  }

  const rows = opRows.map(r => {
    const local = quotationMap[r.quotation] ?? null
    return {
      op_answer_id:          r.id,
      quotation_id:          r.quotation,
      cotacao_id:            local?.cotacao_id         ?? null,
      cotacao_identifier:    local?.cotacao_identifier ?? r.quotation_code ?? String(r.quotation ?? "—"),
      company_name:          local?.company_name       ?? r.company?.short_name ?? "—",
      supplier_name:         r.supplier?.short_name    ?? r.supplier_name       ?? "—",
      supplier_city:         r.supplier?.city          ?? null,
      supplier_email:        r.supplier_email          ?? r.supplier?.email     ?? null,
      supplier_foreign_id:   r.supplier?.id            ?? null,
      payment_method:        r.payment_method          ?? null,
      answered_at:           r.answered_at             ?? null,
      arrival_estimate:      r.arrival_estimate        ?? null,
      valid_until:           r.valid_until             ?? null,
      item_count:            Array.isArray(r.answered_items) ? r.answered_items.length : (r.items_count ?? 0),
      observations:          r.observations            ?? null,
    }
  })

  return NextResponse.json({ rows, total, page, per: 50, days: days ?? "todos" })
}
