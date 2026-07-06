import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { logAdminAction } from "@/lib/admin-audit"

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
  const status = searchParams.get("status") ?? "all"
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = 20
  const offset = (page - 1) * limit

  const rows = await sql`
    SELECT
      u.id, u.name, u.email, u.phone, u.is_active, u.is_platform_admin, u.created_at,
      COUNT(cu.company_id)::int AS company_count
    FROM users u
    LEFT JOIN company_users cu ON cu.user_id = u.id
    WHERE
      (${search} = '' OR u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
      AND (${status} = 'all'
           OR (${status} = 'active'   AND u.is_active = true)
           OR (${status} = 'inactive' AND u.is_active = false))
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM users
    WHERE
      (${search} = '' OR name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})
      AND (${status} = 'all'
           OR (${status} = 'active'   AND is_active = true)
           OR (${status} = 'inactive' AND is_active = false))
  `

  return NextResponse.json({ rows, total, page, limit })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!(await requireAdmin(session))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const { userId, is_active } = await req.json()
  if (!userId || typeof is_active !== "boolean") return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  await sql`UPDATE users SET is_active = ${is_active} WHERE id = ${userId}`

  await logAdminAction({
    adminId:    session!.user_id,
    adminName:  session!.name,
    action:     is_active ? "Usuário reativado" : "Usuário desativado",
    entityType: "user",
    entityId:   userId,
  })

  return NextResponse.json({ ok: true })
}
