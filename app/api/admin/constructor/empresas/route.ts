import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  fantasy_name:  "co.fantasy_name",
  cnpj:          "co.cnpj",
  city:          "co.city",
  created_at:    "co.created_at",
  user_count:    "COUNT(DISTINCT cu.user_id)",
  cotacao_count: "COUNT(DISTINCT c.id)",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "co.created_at DESC" })

  const rows = await db(
    `SELECT co.id, co.fantasy_name, co.company_name, co.cnpj, co.city, co.state,
      co.phone_primary, co.email, co.created_at,
      COUNT(DISTINCT cu.user_id) AS user_count,
      COUNT(DISTINCT c.id) AS cotacao_count,
      COUNT(*) OVER() AS total_count
    FROM companies co
    LEFT JOIN company_users cu ON cu.company_id = co.id
    LEFT JOIN cotacoes c ON c.company_id = co.id
    WHERE ($1 = '' OR co.fantasy_name ILIKE $2 OR co.company_name ILIKE $2 OR co.cnpj ILIKE $2)
    GROUP BY co.id
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [q, `%${q}%`, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
