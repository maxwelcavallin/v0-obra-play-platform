import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  created_at:  "created_at",
  admin_name:  "admin_name",
  action:      "action",
  entity_type: "entity_type",
}

const db = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const adminCheck = await requirePlatformAdminApi(req)
  if (adminCheck) return adminCheck

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const per    = 50
  const offset = (page - 1) * per
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "created_at DESC" })

  const logs = await db(
    `SELECT id, admin_name, action, entity_type, entity_id, details, created_at
    FROM admin_audit_log
    WHERE ($1 = '' OR admin_name ILIKE $2 OR action ILIKE $2)
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [search, `%${search}%`, per, offset]
  )

  const [{ total }] = await db(
    `SELECT COUNT(*) AS total FROM admin_audit_log WHERE ($1 = '' OR admin_name ILIKE $2 OR action ILIKE $2)`,
    [search, `%${search}%`]
  )

  return NextResponse.json({ logs, total: Number(total), page, per })
}
