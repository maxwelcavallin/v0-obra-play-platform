import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

const db = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const adminCheck = await requirePlatformAdminApi(req)
  if (adminCheck) return adminCheck

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const per    = 50
  const offset = (page - 1) * per

  const logs = await db`
    SELECT id, admin_name, action, entity_type, entity_id, details, created_at
    FROM admin_audit_log
    WHERE (${search} = '' OR admin_name ILIKE ${'%' + search + '%'} OR action ILIKE ${'%' + search + '%'})
    ORDER BY created_at DESC
    LIMIT ${per} OFFSET ${offset}
  `

  const [{ total }] = await db`
    SELECT COUNT(*) AS total FROM admin_audit_log
    WHERE (${search} = '' OR admin_name ILIKE ${'%' + search + '%'} OR action ILIKE ${'%' + search + '%'})
  `

  return NextResponse.json({ logs, total: Number(total), page, per })
}
