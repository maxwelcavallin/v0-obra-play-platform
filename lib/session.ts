import { cookies, headers } from "next/headers"
import { sql } from "./db"

export const SESSION_COOKIE = "op_session_token"

export async function getSession() {
  // 1. Tenta cookie HTTP-only
  const cookieStore = await cookies()
  let token = cookieStore.get(SESSION_COOKIE)?.value

  // 2. Fallback: header Authorization: Bearer <token>
  if (!token) {
    const headerStore = await headers()
    const auth = headerStore.get("authorization") ?? ""
    if (auth.startsWith("Bearer ")) token = auth.slice(7)
  }

  if (!token) return null

  const rows = await sql`
    SELECT s.*, u.id as user_id, u.name, u.email, u.phone
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
