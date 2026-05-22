import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params

  const [row] = await sql`
    SELECT c.*, o.name AS obra_name, o.delivery_street, o.delivery_number,
      o.delivery_neighbourhood, o.delivery_city, o.delivery_state, o.delivery_zipcode,
      o.billing_street, o.billing_number, o.billing_neighbourhood, o.billing_city, o.billing_state,
      u.name AS created_by_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.id = ${id}
  `
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const items = await sql`SELECT * FROM cotacao_itens WHERE cotacao_id = ${id} ORDER BY created_at`
  const suppliers = await sql`SELECT * FROM cotacao_fornecedores WHERE cotacao_id = ${id} ORDER BY is_recommended DESC, created_at`

  return NextResponse.json({ ...row, items, suppliers })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const b = await req.json()

  const [updated] = await sql`
    UPDATE cotacoes SET
      status = COALESCE(${b.status ?? null}, status),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(updated)
}
