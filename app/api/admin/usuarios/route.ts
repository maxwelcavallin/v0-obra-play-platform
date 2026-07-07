import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { logAdminAction } from "@/lib/admin-audit"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  name:          "u.name",
  email:         "u.email",
  company_count: "COUNT(cu.company_id)",
  created_at:    "u.created_at",
  is_active:     "u.is_active",
}

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const [u] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  return !!u?.is_platform_admin
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!(await requireAdmin(session))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? "all"
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = 20
  const offset = (page - 1) * limit
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "u.created_at DESC" })

  const rows = await db(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.is_platform_admin, u.created_at,
      COUNT(cu.company_id)::int AS company_count
    FROM users u
    LEFT JOIN company_users cu ON cu.user_id = u.id
    WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2)
      AND ($3 = 'all'
           OR ($3 = 'active'   AND u.is_active = true)
           OR ($3 = 'inactive' AND u.is_active = false))
    GROUP BY u.id
    ORDER BY ${orderBy}
    LIMIT $4 OFFSET $5`,
    [search, `%${search}%`, status, limit, offset]
  )

  const [{ total }] = await db(
    `SELECT COUNT(*)::int AS total FROM users
    WHERE ($1 = '' OR name ILIKE $2 OR email ILIKE $2)
      AND ($3 = 'all' OR ($3 = 'active' AND is_active = true) OR ($3 = 'inactive' AND is_active = false))`,
    [search, `%${search}%`, status]
  )

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
