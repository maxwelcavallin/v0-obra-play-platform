import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// GET /api/financeiro/transacoes?company_id=...&type=...&status=...
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const p = req.nextUrl.searchParams
    const companyId = p.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const type = p.get("type")    // receita | despesa | null
    const status = p.get("status") // pendente | pago | cancelado | null

    const rows = await sql`
      SELECT t.*, c.full_name as client_name, c.fantasy_name as client_fantasy,
             cat.name as category_name, cat.color as category_color
      FROM transactions t
      LEFT JOIN clients c ON c.id = t.client_id
      LEFT JOIN transaction_categories cat ON cat.id = t.category_id
      WHERE t.company_id = ${companyId}
        AND t.deleted_at IS NULL
        AND (${type}::text IS NULL OR t.type = ${type})
        AND (${status}::text IS NULL OR t.status = ${status})
      ORDER BY t.due_date DESC NULLS LAST, t.created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err) {
    console.error("[GET transacoes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/transacoes
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const b = await req.json()
    if (!b.company_id || !b.description || !b.amount || !b.type) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO transactions (
        company_id, client_id, category_id, description, amount, type,
        due_date, paid_at, status, recurrence, notes
      ) VALUES (
        ${b.company_id}, ${b.client_id ?? null}, ${b.category_id ?? null},
        ${b.description}, ${b.amount}, ${b.type},
        ${b.due_date ?? null}, ${b.paid_at ?? null},
        ${b.status ?? 'pendente'}, ${b.recurrence ?? 'unica'}, ${b.notes ?? null}
      )
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error("[POST transacoes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
