import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = neon(process.env.DATABASE_URL!)

  // Resolve token → cotacao_id
  const [st] = await db`
    SELECT entity_id FROM share_tokens
    WHERE token = ${token} AND entity_type = 'cotacao_mapa'
      AND (expires_at IS NULL OR expires_at > NOW())
  `
  if (!st) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 })

  const cotacaoId = st.entity_id

  const [cotacao] = await db`
    SELECT c.id, c.identifier, c.status, c.need_date,
           o.name AS obra_name,
           co.fantasy_name AS company_name, co.logo_url AS company_logo
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.id = ${cotacaoId}
  `
  if (!cotacao) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })

  const items = await db`
    SELECT id, name, unit, quantity FROM cotacao_itens
    WHERE cotacao_id = ${cotacaoId} ORDER BY created_at
  `

  const suppliers = await db`
    SELECT id, supplier_name, supplier_city FROM cotacao_fornecedores
    WHERE cotacao_id = ${cotacaoId} ORDER BY is_recommended DESC, created_at
  `

  const respostas = await db`
    SELECT * FROM cotacao_respostas WHERE cotacao_id = ${cotacaoId}
  `

  return NextResponse.json({ cotacao, items, suppliers, respostas })
}
