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

  const baseParams = {
    search:    q || undefined,
    page,
    page_size: 50,
    ordering,
  }

  let opResult: { results: any[]; count: number } = { results: [], count: 0 }
  let opError: string | null = null

  try {
    opResult = await obraplay.orders.list({
      ...baseParams,
      created_at__gte: cutoffDate(days),
    })
  } catch (e: any) {
    console.error("[v0] ordens API error (with date filter):", e?.message)
    try {
      opResult = await obraplay.orders.list(baseParams)
      opError  = "Filtro de período ignorado (parâmetro não suportado pela API)"
    } catch (e2: any) {
      console.error("[v0] ordens API error (without date filter):", e2?.message)
      return NextResponse.json(
        { error: "Falha ao buscar ordens na API ObraPlay", detail: e2?.message, rows: [], total: 0 },
        { status: 502 }
      )
    }
  }

  const opRows: any[]  = opResult.results ?? []
  const total: number  = opResult.count   ?? 0

  // Enriquece com dados locais: empresa e cotação pelo foreign_id / code
  const db = neon(process.env.DATABASE_URL!)

  const opCodes = opRows.map(r => r.code).filter(Boolean)
  let localMap: Record<string, { company_name: string; cotacao_identifier: string; local_id: string; obraplay_sync_error: string | null }> = {}

  if (opCodes.length > 0) {
    try {
      const placeholders = opCodes.map((_, i) => `$${i + 1}`).join(",")
      const local = await db.query(
        `SELECT oc.id AS local_id, oc.obraplay_order_code, oc.obraplay_sync_error,
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
      console.error("[v0] ordens DB enrich error:", dbErr?.message)
    }
  }

  // Garante que o valor é string/number/null — nunca um objeto
  function scalar(v: any): string | null {
    if (v == null) return null
    if (typeof v === "string") return v || null
    if (typeof v === "number") return String(v)
    if (typeof v === "object") return v.code ?? v.name ?? v.id ?? null
    return String(v)
  }

  let rows = opRows.map(o => {
    const local = localMap[o.code] ?? null
    // total da API ObraPlay vem em micros (int) ou em reais (string decimal)
    // Detecta: se for número inteiro grande (> 10000), assume micros
    let totalReais: number | null = null
    if (o.total != null) {
      const raw = Number(o.total)
      totalReais = Number.isInteger(raw) && raw > 10000
        ? raw / 1_000_000
        : raw
    }
    return {
      id:                    o.id,
      obraplay_order_id:     o.id,
      obraplay_order_code:   scalar(o.code)            ?? null,
      status:                scalar(o.status)          ?? "—",
      supplier_name:         scalar(o.supplier_company?.short_name ?? o.supplier_name ?? o.supplier_company) ?? "—",
      supplier_email:        scalar(o.supplier_email)  ?? null,
      total:                 totalReais,
      payment_method:        scalar(o.payment_method)  ?? null,
      created_at:            scalar(o.created_at)      ?? null,
      cotacao_identifier:    local?.cotacao_identifier ?? scalar(o.quotation_code) ?? null,
      company_name:          local?.company_name       ?? scalar(o.company?.short_name ?? o.company_name ?? o.company) ?? "—",
      obraplay_sync_error:   local?.obraplay_sync_error ?? null,
      local_id:              local?.local_id           ?? null,
    }
  })

  if (syncErr === "yes") {
    rows = rows.filter(r => r.obraplay_sync_error)
  }

  return NextResponse.json({ rows, total, page, per: 50, days: days ?? "todos", _warning: opError })
}
