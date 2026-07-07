import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { logAdminAction } from "@/lib/admin-audit"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  name: "u.name", email: "u.email", phone: "u.phone",
  is_active: "u.is_active", created_at: "u.created_at",
  companies_count: "COUNT(DISTINCT cu.company_id)",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const status = searchParams.get("status") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "u.created_at DESC" })

  const rows = await db(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
      COUNT(DISTINCT cu.company_id) AS companies_count,
      COUNT(*) OVER() AS total_count
    FROM users u
    LEFT JOIN company_users cu ON cu.user_id = u.id
    WHERE u.is_platform_admin = false
      AND ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2)
      AND ($3 = '' OR ($3 = 'active' AND u.is_active = true) OR ($3 = 'inactive' AND u.is_active = false))
    GROUP BY u.id
    ORDER BY ${orderBy}
    LIMIT $4 OFFSET $5`,
    [q, `%${q}%`, status, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}

export async function PATCH(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const body = await req.json()
  const { id, is_active } = body

  await db`UPDATE users SET is_active = ${is_active} WHERE id = ${id}`
  await logAdminAction({
    adminId: "system",
    adminName: "Admin",
    action: is_active ? "activate_user" : "deactivate_user",
    entityType: "user",
    entityId: id,
  })

  return NextResponse.json({ ok: true })
}
