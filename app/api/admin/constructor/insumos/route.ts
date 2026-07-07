import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  name:          "i.name",
  category:      "i.category",
  unit:          "i.unit",
  internal_code: "i.internal_code",
  company_name:  "co.fantasy_name",
  created_at:    "i.created_at",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 100
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "i.name ASC" })

  const rows = await db.query(
    `SELECT i.id, i.name, i.unit, i.category, i.internal_code, i.created_at,
      co.fantasy_name AS company_name,
      COUNT(*) OVER() AS total_count
    FROM insumos i
    LEFT JOIN companies co ON co.id = i.company_id
    WHERE ($1 = '' OR i.name ILIKE $2 OR i.category ILIKE $2 OR i.unit ILIKE $2)
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [q, `%${q}%`, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ insumos: rows, total, page, per })
}
