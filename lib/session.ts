import { cookies, headers } from "next/headers"
import { sql } from "./db"
import { validateApiKey } from "./api-key"

export const SESSION_COOKIE = "op_session_token"

export async function getSession() {
  const headerStore = await headers()

  // 1. API Key dedicada (integração de agentes) — header `x-api-key`
  //    ou `Authorization: ApiKey <chave>`. Tem prioridade e não expira.
  const apiKeyHeader = headerStore.get("x-api-key")
  const authHeader = headerStore.get("authorization") ?? ""
  const apiKey =
    apiKeyHeader ??
    (authHeader.startsWith("ApiKey ") ? authHeader.slice(7) : null)

  if (apiKey) {
    const apiSession = await validateApiKey(apiKey)
    if (apiSession) return apiSession
    // chave inválida/revogada: não cai para sessão de cookie
    return null
  }

  // 2. Sessão de usuário (UI): cookie HTTP-only
  const cookieStore = await cookies()
  let token = cookieStore.get(SESSION_COOKIE)?.value

  // 3. Fallback: header Authorization: Bearer <token de sessão>
  if (!token && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7)
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

/**
 * R13: Agente IA não pode executar DELETE.
 * Retorna true se a requisição atual usa autenticação por API Key (agente).
 */
export async function isAgentRequest(): Promise<boolean> {
  const headerStore = await headers()
  const apiKeyHeader = headerStore.get("x-api-key")
  const authHeader = headerStore.get("authorization") ?? ""
  return !!(apiKeyHeader || authHeader.startsWith("ApiKey "))
}

/**
 * R13: Bloqueia DELETE quando a requisição vem do agente IA.
 * Deve ser chamado no início de todo handler DELETE.
 */
export async function blockAgentDelete(): Promise<Response | null> {
  if (await isAgentRequest()) {
    const { NextResponse } = await import("next/server")
    return NextResponse.json(
      { error: "O agente IA não tem permissão para executar exclusões. Use a interface do usuário." },
      { status: 403 }
    )
  }
  return null
}
