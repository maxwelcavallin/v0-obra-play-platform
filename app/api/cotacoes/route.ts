import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

function genIdentifier() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function GET(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const company_id = req.nextUrl.searchParams.get("company_id")
  if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const rows = await sql`
    SELECT
      c.id, c.identifier, c.status, c.need_date, c.expiry_date, c.response_date,
      c.requester_name, c.created_at, c.updated_at,
      o.name AS obra_name, o.delivery_city, o.delivery_state,
      (SELECT COUNT(*)::int FROM cotacao_itens WHERE cotacao_id = c.id) AS item_count,
      (SELECT COUNT(*)::int FROM cotacao_fornecedores WHERE cotacao_id = c.id) AS supplier_count,
      u.name AS created_by_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.company_id = ${company_id}
    ORDER BY c.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const b = await req.json()
  if (!b.company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const identifier = genIdentifier()

  const [cotacao] = await sql`
    INSERT INTO cotacoes (company_id, obra_id, identifier, status, need_date, expiry_date,
      general_notes, address_type, financial_box,
      requester_name, requester_email, requester_phone, created_by)
    VALUES (
      ${b.company_id}, ${b.obra_id ?? null}, ${identifier}, 'Nova',
      ${b.need_date ?? null}, ${b.expiry_date ?? null},
      ${b.general_notes ?? null}, ${b.address_type ?? "entrega"}, ${b.financial_box ?? "empresa"},
      ${b.requester_name ?? null}, ${b.requester_email ?? null}, ${b.requester_phone ?? null},
      ${session.userId}
    )
    RETURNING *
  `

  // Inserir itens
  if (Array.isArray(b.items) && b.items.length > 0) {
    for (const item of b.items) {
      await sql`
        INSERT INTO cotacao_itens (cotacao_id, insumo_id, name, unit, quantity)
        VALUES (${cotacao.id}, ${item.insumo_id ?? null}, ${item.name}, ${item.unit}, ${item.quantity})
      `
    }
  }

  // Inserir fornecedores
  if (Array.isArray(b.suppliers) && b.suppliers.length > 0) {
    for (const s of b.suppliers) {
      await sql`
        INSERT INTO cotacao_fornecedores (cotacao_id, supplier_name, supplier_city, supplier_email, supplier_phone, is_recommended)
        VALUES (${cotacao.id}, ${s.name}, ${s.city ?? null}, ${s.email ?? null}, ${s.phone ?? null}, ${s.is_recommended ?? false})
      `
    }
  }

  return NextResponse.json(cotacao, { status: 201 })
}
