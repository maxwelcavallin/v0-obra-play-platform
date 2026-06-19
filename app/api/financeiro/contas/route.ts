import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/contas?company_id=
export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const companyId = req.nextUrl.searchParams.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const rows = await sql`
      SELECT
        a.*,
        COALESCE(
          a.initial_balance +
          COALESCE(SUM(CASE WHEN t.type = 'receita' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN t.type = 'despesa' AND t.status = 'pago' THEN t.amount ELSE 0 END), 0),
          a.initial_balance
        ) AS current_balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
      WHERE a.company_id = ${companyId} AND a.deleted_at IS NULL
      GROUP BY a.id
      ORDER BY a.name
    `
    console.log("[contas GET] company:", companyId, "rows:", rows.length)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[contas GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/contas
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const b = await req.json()
    console.log("[contas POST] body:", JSON.stringify(b))

    if (!b.company_id || !b.name) {
      return NextResponse.json({ error: "company_id e name são obrigatórios" }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO accounts (company_id, name, type, bank, agency, account_number, initial_balance, color)
      VALUES (
        ${b.company_id}, ${b.name}, ${b.type ?? "corrente"},
        ${b.bank ?? null}, ${b.agency ?? null}, ${b.account_number ?? null},
        ${Number(b.initial_balance ?? 0)}, ${b.color ?? null}
      )
      RETURNING *
    `
    console.log("[contas POST] criada:", row.id)
    return NextResponse.json(row, { status: 201 })
  } catch (err: any) {
    console.error("[contas POST] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
