import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET — retorna ou cria token de compartilhamento
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  // Verifica se cotação existe
  const [cotacao] = await db`SELECT id, company_id FROM cotacoes WHERE id = ${id}`
  if (!cotacao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  // Busca token existente ou cria
  let [existing] = await db`
    SELECT token FROM share_tokens
    WHERE entity_type = 'cotacao_mapa' AND entity_id = ${id}
    LIMIT 1
  `
  if (!existing) {
    ;[existing] = await db`
      INSERT INTO share_tokens (entity_type, entity_id, company_id)
      VALUES ('cotacao_mapa', ${id}, ${cotacao.company_id})
      RETURNING token
    `
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://v0-obra-play-platform.vercel.app"
  return NextResponse.json({ token: existing.token, url: `${baseUrl}/mapa/${existing.token}` })
}
