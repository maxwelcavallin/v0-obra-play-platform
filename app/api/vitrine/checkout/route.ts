import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"

const db = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { obra_id, company_id, need_date, notes } = await req.json()
  if (!obra_id || !company_id) {
    return NextResponse.json({ error: "Obra e empresa são obrigatórios" }, { status: 400 })
  }

  // Busca itens do carrinho
  const cartItems = await db`
    SELECT sc.quantity, si.name, si.unit, si.id AS item_id
    FROM showcase_cart sc
    JOIN showcase_items si ON si.id = sc.item_id
    WHERE sc.user_id = ${session.userId}
  `

  if (!cartItems.length) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 })
  }

  // Gera identifier único para a cotação
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const identifier = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")

  // Cria cotação
  const [cotacao] = await db`
    INSERT INTO cotacoes (
      company_id, obra_id, identifier, status,
      need_date, general_notes, address_type, created_by
    ) VALUES (
      ${company_id}, ${obra_id}, ${identifier}, 'Rascunho',
      ${need_date ?? null}, ${notes ?? null}, 'obra', ${session.userId}
    )
    RETURNING id, identifier
  `

  // Cria itens da cotação a partir do carrinho
  for (const item of cartItems) {
    await db`
      INSERT INTO cotacao_itens (cotacao_id, name, unit, quantity)
      VALUES (${cotacao.id}, ${item.name}, ${item.unit}, ${item.quantity})
    `
  }

  // Limpa carrinho
  await db`DELETE FROM showcase_cart WHERE user_id = ${session.userId}`

  return NextResponse.json({ ok: true, cotacao_id: cotacao.id, identifier: cotacao.identifier })
}
