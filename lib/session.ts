import { cookies } from "next/headers"
import { sql } from "./db"

export const SESSION_COOKIE = "op_session_token"

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const rows = await sql`
    SELECT s.*, u.id as user_id, u.name, u.email, u.phone, u.avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > now()
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autenticado")
  return session
}
