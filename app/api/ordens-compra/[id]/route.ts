import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params

  const [row] = await sql`
    SELECT oc.*,
      c.identifier AS cotacao_identifier,
      c.obraplay_quotation_code,
      o.name AS obra_name,
      o.delivery_street, o.delivery_number, o.delivery_neighbourhood,
      o.delivery_city, o.delivery_state, o.delivery_zipcode,
      co.fantasy_name AS company_name, co.cnpj AS company_cnpj,
      co.street AS company_street, co.number AS company_number,
      co.city AS company_city, co.state AS company_state
    FROM ordens_compra oc
    LEFT JOIN cotacoes c ON c.id = oc.cotacao_id
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN companies co ON co.id = oc.company_id
    WHERE oc.id = ${id}
  `
  if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
  return NextResponse.json(row)
}

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const b = await _req.json()

  const [updated] = await sql`
    UPDATE ordens_compra SET
      status = COALESCE(${b.status ?? null}, status),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(updated)
}
