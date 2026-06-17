import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/transacoes?company_id=&type=&status=&month=YYYY-MM&search=&page=
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    console.log("[financeiro/transacoes GET] user:", session.user_id)

    const p = req.nextUrl.searchParams
    const companyId = p.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const type   = p.get("type")   ?? null  // receita | despesa
    const status = p.get("status") ?? null  // pendente | pago | cancelado
    const month  = p.get("month")  ?? null  // YYYY-MM
    const search = p.get("search") ?? null

    // month filter: 2026-06 → start/end
    const monthStart = month ? `${month}-01` : null
    const monthEnd   = month ? `${month}-31` : null

    const rows = await sql`
      SELECT
        t.id, t.description, t.amount, t.type, t.status,
        t.due_date, t.paid_at, t.recurrence, t.notes,
        t.created_at, t.updated_at,
        t.client_id, t.category_id,
        c.full_name   AS client_name,
        c.fantasy_name AS client_fantasy,
        cat.name  AS category_name,
        cat.color AS category_color
      FROM transactions t
      LEFT JOIN clients c    ON c.id = t.client_id
      LEFT JOIN transaction_categories cat ON cat.id = t.category_id
      WHERE t.company_id = ${companyId}
        AND t.deleted_at IS NULL
        AND (${type}::text   IS NULL OR t.type   = ${type})
        AND (${status}::text IS NULL OR t.status = ${status})
        AND (${monthStart}::text IS NULL OR t.due_date >= ${monthStart}::date)
        AND (${monthEnd}::text   IS NULL OR t.due_date <= ${monthEnd}::date)
        AND (${search}::text IS NULL
             OR t.description ILIKE ${'%' + (search ?? '') + '%'}
             OR c.full_name   ILIKE ${'%' + (search ?? '') + '%'}
             OR c.fantasy_name ILIKE ${'%' + (search ?? '') + '%'}
            )
      ORDER BY
        CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
        t.due_date DESC,
        t.created_at DESC
    `

    console.log("[financeiro/transacoes GET] rows:", rows.length, "company:", companyId)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[financeiro/transacoes GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/transacoes
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const b = await req.json()
    console.log("[financeiro/transacoes POST] body:", JSON.stringify(b))

    if (!b.company_id || !b.description || b.amount == null || !b.type) {
      return NextResponse.json({ error: "company_id, description, amount e type são obrigatórios" }, { status: 400 })
    }
    if (!["receita", "despesa"].includes(b.type)) {
      return NextResponse.json({ error: "type deve ser 'receita' ou 'despesa'" }, { status: 400 })
    }
    if (!["pendente", "pago", "cancelado"].includes(b.status ?? "pendente")) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO transactions (
        company_id, client_id, category_id, description, amount, type,
        due_date, paid_at, status, recurrence, notes
      ) VALUES (
        ${b.company_id},
        ${b.client_id   ?? null},
        ${b.category_id ?? null},
        ${b.description},
        ${Number(b.amount)},
        ${b.type},
        ${b.due_date  ?? null},
        ${b.paid_at   ?? null},
        ${b.status    ?? "pendente"},
        ${b.recurrence ?? "unica"},
        ${b.notes     ?? null}
      )
      RETURNING *
    `
    console.log("[financeiro/transacoes POST] criada:", row.id)
    return NextResponse.json(row, { status: 201 })
  } catch (err: any) {
    console.error("[financeiro/transacoes POST] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
