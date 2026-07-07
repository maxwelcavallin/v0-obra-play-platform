import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  obraplay_order_code: "oc.obraplay_order_code",
  status:              "oc.status",
  supplier_name:       "oc.supplier_name",
  company_name:        "co.fantasy_name",
  cotacao_identifier:  "c.identifier",
  total:               "oc.total",
  created_at:          "oc.created_at",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "oc.created_at DESC" })

  const rows = await db.query(
    `SELECT oc.id, oc.status, oc.supplier_name, oc.total, oc.created_at,
      oc.obraplay_order_id, oc.obraplay_order_code, oc.obraplay_sync_error,
      co.fantasy_name AS company_name,
      c.identifier AS cotacao_identifier,
      COUNT(*) OVER() AS total_count
    FROM ordens_compra oc
    LEFT JOIN companies co ON co.id = oc.company_id
    LEFT JOIN cotacoes c ON c.id = oc.cotacao_id
    WHERE ($1 = '' OR oc.supplier_name ILIKE $2 OR co.fantasy_name ILIKE $2 OR oc.obraplay_order_code ILIKE $2)
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [q, `%${q}%`, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
