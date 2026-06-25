import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/transacoes?company_id=&type=&status=&month=YYYY-MM&search=&obra_id=&account_id=&page=
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const p = req.nextUrl.searchParams
    const companyId = p.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const type      = p.get("type")      ?? null
    const status    = p.get("status")    ?? null
    const month     = p.get("month")     ?? null
    const search    = p.get("search")    ?? null
    const obraId    = p.get("obra_id")   ?? null
    const accountId = p.get("account_id") ?? null

    const monthStart = month ? `${month}-01` : null
    const monthEnd   = month ? (() => {
      const [y, m] = month.split("-").map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      return `${month}-${String(lastDay).padStart(2, "0")}`
    })() : null

    const rows = await sql`
      SELECT
        t.id, t.description, t.amount, t.type, t.status,
        t.due_date, t.paid_at, t.recurrence, t.notes,
        t.created_at, t.updated_at,
        t.client_id, t.category_id, t.account_id, t.obra_id,
        t.installment_total, t.installment_index, t.installment_group_id,
        c.full_name    AS client_name,
        c.fantasy_name AS client_fantasy,
        cat.name       AS category_name,
        cat.color      AS category_color,
        acc.name       AS account_name,
        acc.color      AS account_color,
        o.name         AS obra_name
      FROM transactions t
      LEFT JOIN clients c              ON c.id  = t.client_id
      LEFT JOIN transaction_categories cat ON cat.id = t.category_id
      LEFT JOIN accounts acc           ON acc.id = t.account_id
      LEFT JOIN obras o                ON o.id   = t.obra_id
      WHERE t.company_id = ${companyId}
        AND t.deleted_at IS NULL
        AND (${type}::text      IS NULL OR t.type      = ${type})
        AND (${status}::text    IS NULL OR t.status    = ${status})
        AND (${obraId}::text    IS NULL OR t.obra_id   = ${obraId}::uuid)
        AND (${accountId}::text IS NULL OR t.account_id = ${accountId}::uuid)
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

    console.log("[transacoes GET] rows:", rows.length, "company:", companyId)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[transacoes GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/transacoes — suporta parcelamento (installments)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const b = await req.json()
    // log de debug removido (R10 — dados de usuário não devem ser expostos nos logs)

    if (!b.company_id || !b.description || b.amount == null || !b.type) {
      return NextResponse.json({ error: "company_id, description, amount e type são obrigatórios" }, { status: 400 })
    }
    if (!["receita", "despesa"].includes(b.type)) {
      return NextResponse.json({ error: "type deve ser 'receita' ou 'despesa'" }, { status: 400 })
    }
    if (!["pendente", "pago", "cancelado"].includes(b.status ?? "pendente")) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 })
    }

    const installments = Number(b.installments ?? 1)

    // Parcelamento: gera N transações com mesmo installment_group_id
    if (installments > 1) {
      const groupId = crypto.randomUUID()
      const rows = []
      const baseDate = b.due_date ? new Date(b.due_date) : new Date()
      const installmentAmount = Math.round((Number(b.amount) / installments) * 100) / 100

      for (let i = 0; i < installments; i++) {
        const dueDate = new Date(baseDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        const dueDateStr = dueDate.toISOString().split("T")[0]
        const label = `${b.description} (${i + 1}/${installments})`

        const [row] = await sql`
          INSERT INTO transactions (
            company_id, client_id, category_id, account_id, obra_id,
            description, amount, type, due_date, paid_at, status,
            recurrence, notes, installment_total, installment_index, installment_group_id
          ) VALUES (
            ${b.company_id}, ${b.client_id ?? null}, ${b.category_id ?? null},
            ${b.account_id ?? null}, ${b.obra_id ?? null},
            ${label}, ${installmentAmount}, ${b.type},
            ${dueDateStr}, ${i === 0 && b.status === "pago" ? (b.paid_at ?? dueDateStr) : null},
            ${i === 0 ? (b.status ?? "pendente") : "pendente"},
            'unica', ${b.notes ?? null},
            ${installments}, ${i + 1}, ${groupId}::uuid
          )
          RETURNING *
        `
        rows.push(row)
      }
      console.log("[transacoes POST] parcelamento criado:", rows.length, "parcelas, grupo:", groupId)
      return NextResponse.json({ installment_group_id: groupId, rows }, { status: 201 })
    }

    // Transação única
    const [row] = await sql`
      INSERT INTO transactions (
        company_id, client_id, category_id, account_id, obra_id,
        description, amount, type, due_date, paid_at, status, recurrence, notes
      ) VALUES (
        ${b.company_id}, ${b.client_id ?? null}, ${b.category_id ?? null},
        ${b.account_id ?? null}, ${b.obra_id ?? null},
        ${b.description}, ${Number(b.amount)}, ${b.type},
        ${b.due_date ?? null}, ${b.paid_at ?? null},
        ${b.status ?? "pendente"}, ${b.recurrence ?? "unica"}, ${b.notes ?? null}
      )
      RETURNING *
    `
    console.log("[transacoes POST] criada:", row.id)
    return NextResponse.json(row, { status: 201 })
  } catch (err: any) {
    console.error("[transacoes POST] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
