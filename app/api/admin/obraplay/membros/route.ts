import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  name:         "mm.name",
  email:        "mm.email",
  company_name: "mc.short_name",
  role:         "mm.role",
  is_active:    "mm.is_active",
  last_sync_at: "mm.last_sync_at",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "mm.last_sync_at DESC NULLS LAST, mm.name ASC" })

  const rows = await db.query(
    `SELECT mm.id, mm.member_id, mm.name, mm.email, mm.phone, mm.role, mm.is_active, mm.last_sync_at,
      mc.short_name AS company_name, mc.company_id,
      COUNT(*) OVER() AS total_count
    FROM mirror_members mm
    JOIN mirror_companies mc ON mc.company_id = mm.company_id
    WHERE ($1 = '' OR mm.name ILIKE $2 OR mm.email ILIKE $2 OR mc.short_name ILIKE $2)
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [q, `%${q}%`, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
