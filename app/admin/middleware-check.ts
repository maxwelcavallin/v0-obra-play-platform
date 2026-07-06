/**
 * Helper server-side para verificar se o usuário logado é platform admin.
 * Chamado nos layouts e pages do /admin via RSC.
 */
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function requirePlatformAdmin() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [user] = await sql`
    SELECT is_platform_admin FROM users WHERE id = ${session.user_id}
  `
  if (!user?.is_platform_admin) redirect("/dashboard")

  return session
}
