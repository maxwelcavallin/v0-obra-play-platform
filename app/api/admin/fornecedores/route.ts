import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const [u] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  return !!u?.is_platform_admin
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!(await requireAdmin(session))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const level  = searchParams.get("level")  ?? "all"
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = 25
  const offset = (page - 1) * limit

  const rows = await sql`
    SELECT
      mc.company_id, mc.short_name, mc.full_name, mc.city, mc.state, mc.email,
      mc.verified_cnpj, mc.has_confirmed_address, mc.has_confirmed_shipping,
      mc.has_confirmed_configuration,
      mc.avg_response_time_minutes, mc.finalized_answers_count,
      mc.last_sync_at,
      CASE
        WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 'certified'
        WHEN mc.verified_cnpj THEN 'validated'
        ELSE 'basic'
      END AS registration_type,
      COUNT(mm.id)::int AS member_count
    FROM mirror_companies mc
    LEFT JOIN mirror_members mm ON mm.company_id = mc.company_id
    WHERE mc.has_confirmed_configuration = true
      AND (${search} = ''
           OR mc.short_name ILIKE ${'%' + search + '%'}
           OR mc.full_name  ILIKE ${'%' + search + '%'}
           OR mc.city       ILIKE ${'%' + search + '%'})
      AND (${level} = 'all'
           OR (${level} = 'certified' AND mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping)
           OR (${level} = 'validated' AND mc.verified_cnpj AND NOT (mc.has_confirmed_address AND mc.has_confirmed_shipping))
           OR (${level} = 'basic'     AND NOT mc.verified_cnpj))
    GROUP BY mc.company_id
    ORDER BY
      CASE WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 0
           WHEN mc.verified_cnpj THEN 1 ELSE 2 END,
      mc.avg_response_time_minutes ASC NULLS LAST,
      mc.short_name
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM mirror_companies mc
    WHERE mc.has_confirmed_configuration = true
      AND (${search} = ''
           OR mc.short_name ILIKE ${'%' + search + '%'}
           OR mc.full_name  ILIKE ${'%' + search + '%'}
           OR mc.city       ILIKE ${'%' + search + '%'})
      AND (${level} = 'all'
           OR (${level} = 'certified' AND mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping)
           OR (${level} = 'validated' AND mc.verified_cnpj AND NOT (mc.has_confirmed_address AND mc.has_confirmed_shipping))
           OR (${level} = 'basic'     AND NOT mc.verified_cnpj))
  `

  const [syncRow] = await sql`SELECT last_sync_at, total_synced, last_error FROM sync_control WHERE entity = 'mirror_companies' LIMIT 1`

  return NextResponse.json({ rows, total, page, limit, sync: syncRow ?? null })
}
