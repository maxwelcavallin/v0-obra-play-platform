import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

// Segurança:
// - Rota pública sem autenticação — expõe APENAS dados necessários para visualização
// - Nunca retorna: email, telefone, CNPJ, dados pessoais de fornecedores ou usuários
// - Token opaco de 24 bytes (base64url) — não derivável, não enumerável
// - Sem company_id, user_id ou qualquer FK interna no payload

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Sanitiza o token recebido na URL (remove espaços, newlines, padding)
  const cleanToken = token.replace(/[\s=]/g, "")

  // Valida formato básico (evita queries com inputs claramente inválidos)
  if (!cleanToken || !/^[A-Za-z0-9+/=_-]{20,}$/.test(cleanToken)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 })
  }

  const db = neon(process.env.DATABASE_URL!)

  // Garante que a tabela existe (idempotente)
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

  // Resolve token → cotacao_id
  // Compara limpando newlines/espaços de tokens legados gerados sem chr(10) strip
  const [st] = await db`
    SELECT entity_id FROM share_tokens
    WHERE replace(replace(token, chr(10), ''), ' ', '') = ${cleanToken}
      AND entity_type = 'cotacao_mapa'
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `
  if (!st) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 })

  const cotacaoId = st.entity_id as string

  // Dados da cotação — sem company_id, user_id, sem FKs internas
  const [cotacao] = await db`
    SELECT
      c.identifier,
      c.status,
      c.need_date,
      c.general_notes,
      o.name        AS obra_name,
      co.fantasy_name AS company_name,
      co.logo_url     AS company_logo
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.id = ${cotacaoId}
      AND c.deleted_at IS NULL
    LIMIT 1
  `
  if (!cotacao) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })

  // Itens — sem insumo_id ou FKs internas
  const items = await db`
    SELECT id, name, unit, quantity
    FROM cotacao_itens
    WHERE cotacao_id = ${cotacaoId}
    ORDER BY created_at
  `

  // Fornecedores — APENAS nome e cidade, NUNCA email/telefone/CNPJ
  const suppliers = await db`
    SELECT id, supplier_name, supplier_city, is_recommended
    FROM cotacao_fornecedores
    WHERE cotacao_id = ${cotacaoId}
    ORDER BY is_recommended DESC, created_at
  `

  // Respostas — projeção mínima: preços e condições comerciais apenas
  // Nunca retorna dados de contato do fornecedor ou dados internos
  const respostas = await db`
    SELECT
      cotacao_fornecedor_id,
      cotacao_item_id,
      item_name,
      item_unit,
      item_quantity,
      answered,
      available,
      unit_price_micros,
      total_quantity_micros,
      total_discount_micros,
      payment_method,
      installments,
      arrival_estimate,
      observations,
      freight,
      total_freight_micros,
      free_shipping
    FROM cotacao_respostas
    WHERE cotacao_id = ${cotacaoId}
  `

  return NextResponse.json({
    cotacao,
    items,
    suppliers,
    respostas,
  })
}
