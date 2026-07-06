/**
 * Guards de autenticação para o módulo /admin.
 *
 * requirePlatformAdmin()         — RSC / Server Components / layouts
 * requirePlatformAdminApi(req)   — API route handlers (retorna NextResponse | null)
 */
import { redirect } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

/** Para RSC/layouts — redireciona automaticamente se não autorizado */
export async function requirePlatformAdmin() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [user] = await sql`
    SELECT is_platform_admin FROM users WHERE id = ${session.user_id}
  `
  if (!user?.is_platform_admin) redirect("/dashboard")

  return session
}

/** Para API routes — retorna NextResponse de erro ou null se autorizado */
export async function requirePlatformAdminApi(req: NextRequest): Promise<NextResponse | null> {
  const cookieHeader = req.headers.get("cookie") ?? ""
  const match = cookieHeader.match(/op_session_token=([^;]+)/)
  const token = match?.[1] ?? req.headers.get("authorization")?.replace("Bearer ", "") ?? null

  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const rows = await sql`
    SELECT s.user_id FROM sessions s
    WHERE s.token = ${token} AND s.expires_at > now()
    LIMIT 1
  `
  if (!rows[0]) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 })

  const [user] = await sql`
    SELECT is_platform_admin FROM users WHERE id = ${rows[0].user_id}
  `
  if (!user?.is_platform_admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  return null
}
