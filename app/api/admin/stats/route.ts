import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const [user] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  if (!user?.is_platform_admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const [
    [usersRow],
    [companiesRow],
    [cotacoesRow],
    [suppliersRow],
    [syncRow],
    recentActivity,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM users`,
    sql`SELECT COUNT(*)::int AS total FROM companies`,
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS last30 FROM cotacoes`,
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE has_confirmed_configuration)::int AS certified FROM mirror_companies`,
    sql`SELECT last_sync_at, total_synced, last_error FROM sync_control WHERE entity = 'mirror_companies' LIMIT 1`,
    sql`SELECT action, admin_name, entity_type, entity_id, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 8`,
  ])

  return NextResponse.json({
    users:      usersRow,
    companies:  companiesRow,
    cotacoes:   cotacoesRow,
    suppliers:  suppliersRow,
    sync:       syncRow ?? null,
    recentActivity,
  })
}
