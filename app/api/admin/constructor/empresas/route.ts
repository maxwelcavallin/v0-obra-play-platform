import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { logAdminAction } from "@/lib/admin-audit"

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
      co.id, co.fantasy_name, co.company_name, co.cnpj, co.city, co.state,
      co.phone_primary, co.email, co.created_at,
      COUNT(DISTINCT cu.user_id) AS user_count,
      COUNT(DISTINCT c.id) AS cotacao_count,
      COUNT(*) OVER() AS total_count
    FROM companies co
    LEFT JOIN company_users cu ON cu.company_id = co.id
    LEFT JOIN cotacoes c ON c.company_id = co.id
    WHERE (${q} = '' OR co.fantasy_name ILIKE ${'%' + q + '%'} OR co.company_name ILIKE ${'%' + q + '%'} OR co.cnpj ILIKE ${'%' + q + '%'})
    GROUP BY co.id
    ORDER BY co.created_at DESC
    LIMIT ${per} OFFSET ${(page - 1) * per}
  `

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
