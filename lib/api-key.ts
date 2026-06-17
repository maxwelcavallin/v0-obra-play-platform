import { sql } from "./db"
import crypto from "crypto"

/**
 * API Keys para integração de agentes externos (escopo por usuário).
 *
 * Formato da chave entregue ao cliente: `op_live_<32 bytes em base64url>`
 * - Prefixo `op_live_` facilita identificação e busca em logs/segredos.
 * - Apenas o HASH (sha256) é persistido em `api_keys.key_hash`.
 * - O valor em texto puro só é exibido UMA vez, no momento da criação.
 */

const KEY_PREFIX = "op_live_"

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString("base64url")
  const plaintext = `${KEY_PREFIX}${random}`
  const hash = hashApiKey(plaintext)
  // prefix exibível na UI: op_live_ + 6 primeiros chars (para identificar a chave sem revelá-la)
  const prefix = plaintext.slice(0, KEY_PREFIX.length + 6)
  return { plaintext, hash, prefix }
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex")
}

/**
 * Valida uma API Key recebida em texto puro.
 * Retorna o usuário associado (no mesmo formato que getSession) ou null.
 * Também atualiza last_used_at de forma assíncrona (best-effort).
 */
export async function validateApiKey(plaintext: string) {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) return null
  const hash = hashApiKey(plaintext)

  const rows = await sql`
    SELECT k.id as api_key_id, u.id as user_id, u.name, u.email, u.phone
    FROM api_keys k
    JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ${hash}
      AND k.revoked_at IS NULL
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  // best-effort: marca último uso (não bloqueia a requisição)
  sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${row.api_key_id}`.catch(() => {})

  return {
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    via_api_key: true,
  }
}
