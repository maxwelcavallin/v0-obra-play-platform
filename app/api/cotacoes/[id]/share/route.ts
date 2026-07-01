import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET — retorna ou cria token de compartilhamento
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  // Garante que a tabela existe (token gerado explicitamente, sem DEFAULT problemático)
  await db`
    CREATE TABLE IF NOT EXISTS share_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id   UUID NOT NULL,
      company_id  UUID,
      token       TEXT NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  // Verifica se cotação existe
  const [cotacao] = await db`SELECT id, company_id FROM cotacoes WHERE id = ${id}`
  if (!cotacao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  // Busca token existente
  let [existing] = await db`
    SELECT token FROM share_tokens
    WHERE entity_type = 'cotacao_mapa' AND entity_id = ${id}
    LIMIT 1
  `

  if (!existing) {
    // Gera token via encode(gen_random_bytes, 'base64') e substitui chars problemáticos
    // replace +→-, /→_, remove = para ficar URL-safe
    ;[existing] = await db`
      INSERT INTO share_tokens (entity_type, entity_id, company_id, token)
      VALUES (
        'cotacao_mapa',
        ${id},
        ${cotacao.company_id},
        replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '')
      )
      ON CONFLICT (token) DO NOTHING
      RETURNING token
    `
    // Fallback improvável de colisão: tenta mais uma vez com uuid
    if (!existing) {
      ;[existing] = await db`
        INSERT INTO share_tokens (entity_type, entity_id, company_id, token)
        VALUES (
          'cotacao_mapa',
          ${id},
          ${cotacao.company_id},
          replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '')
        )
        RETURNING token
      `
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://v0-obra-play-platform.vercel.app"
  return NextResponse.json({ token: existing.token, url: `${baseUrl}/mapa/${existing.token}` })
}
