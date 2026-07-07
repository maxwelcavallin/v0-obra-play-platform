import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { obraplay } from "@/lib/obraplay-client"

// Calcula a data ISO de corte a partir do número de dias
function cutoffDate(days: number | null): string | undefined {
  if (!days) return undefined
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0] // YYYY-MM-DD
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

  // Mapeia colunas frontend → campos de ordering da API ObraPlay
  const ORDER_MAP: Record<string, string> = {
    created_at:          "created_at",
    supplier_name:       "supplier_company__short_name",
    company_name:        "company__short_name",
    total:               "total",
    obraplay_order_code: "code",
  }
  const ordering = sortParam && ORDER_MAP[sortParam]
    ? `${sortDir === "asc" ? "" : "-"}${ORDER_MAP[sortParam]}`
    : "-created_at"

  // Busca na API ObraPlay
  const opResult = await obraplay.orders.list({
    search:           q || undefined,
    page,
    page_size:        50,
    created_at__gte:  cutoffDate(days),
    ordering,
  })

  const opRows: any[]  = opResult.results ?? []
  const total: number  = opResult.count   ?? 0

  // Enriquece com dados locais: empresa e cotação pelo foreign_id (= identifier da OC local)
  const db = neon(process.env.DATABASE_URL!)

  // Coleta os foreign_ids presentes nesta página para busca em lote
  const foreignIds = opRows
    .map(r => r.foreign_id)
    .filter(Boolean)

  let localMap: Record<string, { company_name: string; cotacao_identifier: string; local_id: string; obraplay_sync_error: string | null }> = {}
  if (foreignIds.length > 0) {
    const placeholders = foreignIds.map((_, i) => `$${i + 1}`).join(",")
    const local = await db.query(
      `SELECT oc.id, oc.obraplay_order_code, oc.obraplay_sync_error,
              c.identifier AS cotacao_identifier,
              co.fantasy_name AS company_name
       FROM ordens_compra oc
       LEFT JOIN cotacoes  c  ON c.id  = oc.cotacao_id
       LEFT JOIN companies co ON co.id = c.company_id
       WHERE oc.obraplay_order_code = ANY(ARRAY[${placeholders}])`,
      foreignIds
    )
    for (const row of local) {
      if (row.obraplay_order_code) localMap[row.obraplay_order_code] = row
    }
  }

  // Filtra por erro de sync (somente OCs que existem localmente com obraplay_sync_error)
  let rows = opRows.map(o => {
    const local = localMap[o.code] ?? null
    return {
      id:                    o.id,
      obraplay_order_id:     o.id,
      obraplay_order_code:   o.code ?? null,
      status:                o.status ?? "—",
      supplier_name:         o.supplier_company?.short_name ?? o.supplier_name ?? "—",
      supplier_email:        o.supplier_email ?? null,
      total:                 o.total != null ? Number(o.total) / 1_000_000 : null,
      payment_method:        o.payment_method ?? null,
      created_at:            o.created_at,
      cotacao_identifier:    local?.cotacao_identifier ?? o.quotation_code ?? null,
      company_name:          local?.company_name ?? o.company?.short_name ?? o.company_name ?? "—",
      obraplay_sync_error:   local?.obraplay_sync_error ?? null,
      local_id:              local?.local_id ?? null,
    }
  })

  if (syncErr === "yes") {
    rows = rows.filter(r => r.obraplay_sync_error)
  }

  return NextResponse.json({ rows, total, page, per: 50, days: days ?? "todos" })
}
