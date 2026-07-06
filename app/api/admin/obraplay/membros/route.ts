import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50

  const rows = await db`
    SELECT
      mm.id, mm.member_id, mm.name, mm.email, mm.phone, mm.role, mm.is_active, mm.last_sync_at,
      mc.short_name AS company_name, mc.company_id,
      COUNT(*) OVER() AS total_count
    FROM mirror_members mm
    JOIN mirror_companies mc ON mc.company_id = mm.company_id
    WHERE (${q} = '' OR mm.name ILIKE ${'%' + q + '%'} OR mm.email ILIKE ${'%' + q + '%'} OR mc.short_name ILIKE ${'%' + q + '%'})
    ORDER BY mm.name
    LIMIT ${per} OFFSET ${(page - 1) * per}
  `

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
