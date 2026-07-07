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

function scalar(v: any): string | null {
  if (v == null) return null
  if (typeof v === "string") return v || null
  if (typeof v === "number") return String(v)
  if (typeof v === "object") return v.display_name ?? v.full_name ?? v.name ?? v.code ?? v.id ?? null
  return String(v)
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { searchParams } = new URL(req.url)
  const q       = searchParams.get("q")      ?? ""
  const status  = searchParams.get("status") ?? ""
  const daysRaw = searchParams.get("days")
  const days    = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page    = Math.max(1, Number(searchParams.get("page") ?? 1))
  const sortParam = searchParams.get("sort") ?? ""
  const sortDir   = searchParams.get("dir")  ?? "desc"

  const ORDER_MAP: Record<string, string> = {
    created_at:   "created_at",
    expires_at:   "expires_at",
    company_name: "company__display_name",
    name:         "name",
    code:         "code",
    items_count:  "items_count",
  }
  const ordering = sortParam && ORDER_MAP[sortParam]
    ? `${sortDir === "asc" ? "" : "-"}${ORDER_MAP[sortParam]}`
    : "-created_at"

  const baseParams: any = {
    search:    q || undefined,
    page,
    page_size: 50,
    ordering,
  }
  if (status) baseParams.status = status

  let opResult: { results: any[]; count: number } = { results: [], count: 0 }
  let opError: string | null = null

  try {
    opResult = await obraplay.quotations.list({ ...baseParams, created_at__gte: cutoffDate(days) })
  } catch (e: any) {
    console.error("[v0] cotacoes API error (with date):", e?.message)
    try {
      opResult = await obraplay.quotations.list(baseParams)
      opError = "Filtro de período ignorado (parâmetro não suportado pela API)"
    } catch (e2: any) {
      console.error("[v0] cotacoes API error (no date):", e2?.message)
      return NextResponse.json(
        { error: "Falha ao buscar cotações na API ObraPlay", detail: e2?.message, rows: [], total: 0 },
        { status: 502 }
      )
    }
  }

  const opRows: any[] = opResult.results ?? []
  const total: number = opResult.count ?? 0

  // Enriquece com dados locais pelo obraplay_quotation_id
  const opIds = opRows.map(r => r.id).filter(Boolean)
  const db = neon(process.env.DATABASE_URL!)
  let localMap: Record<number, { local_id: string; identifier: string; obra_name: string | null }> = {}

  if (opIds.length > 0) {
    try {
      const placeholders = opIds.map((_: any, i: number) => `$${i + 1}`).join(",")
      const local = await db.query(
        `SELECT c.id AS local_id, c.identifier, c.obraplay_quotation_id, o.name AS obra_name
         FROM cotacoes c
         LEFT JOIN obras o ON o.id = c.obra_id
         WHERE c.obraplay_quotation_id = ANY(ARRAY[${placeholders}]::int[])`,
        opIds
      )
      for (const row of local) localMap[row.obraplay_quotation_id] = row
    } catch (dbErr: any) {
      console.error("[v0] cotacoes DB enrich error:", dbErr?.message)
    }
  }

  const rows = opRows.map(r => {
    const local = localMap[r.id] ?? null
    return {
      op_id:           r.id,
      local_id:        local?.local_id ?? null,
      code:            scalar(r.code)                           ?? String(r.id),
      name:            scalar(r.name)                           ?? "—",
      status:          scalar(r.status)                         ?? "—",
      // Empresa solicitante
      company_name:    scalar(r.company?.display_name ?? r.company?.full_name ?? r.company?.short_name ?? r.company) ?? "—",
      company_city:    scalar(r.company?.city)                  ?? null,
      company_state:   scalar(r.company?.state)                 ?? null,
      company_cnpj:    scalar(r.company?.cnpj)                  ?? null,
      // Criador
      creator_name:    scalar(r.creator?.name ?? r.creator?.display_name ?? r.creator) ?? "—",
      // Datas
      created_at:      scalar(r.created_at)                     ?? null,
      expires_at:      scalar(r.expires_at)                     ?? null,
      requirement_date: scalar(r.requirement_date)              ?? null,
      canceled_at:     scalar(r.canceled_at)                    ?? null,
      // Contagens
      items_count:     r.items_count ?? 0,
      answers_count:   r.answers_count ?? 0,
      // Obra (local)
      obra_name:       local?.obra_name                         ?? null,
      identifier:      local?.identifier                        ?? null,
    }
  })

  return NextResponse.json({ rows, total, page, per: 50, days: days ?? "todos", _warning: opError })
}
