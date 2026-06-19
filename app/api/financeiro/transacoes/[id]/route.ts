import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/transacoes/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params

    const [row] = await sql`
      SELECT
        t.*,
        c.full_name    AS client_name,
        c.fantasy_name AS client_fantasy,
        cat.name  AS category_name,
        cat.color AS category_color
      FROM transactions t
      LEFT JOIN clients c  ON c.id = t.client_id
      LEFT JOIN transaction_categories cat ON cat.id = t.category_id
      WHERE t.id = ${id} AND t.deleted_at IS NULL
    `
    if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err: any) {
    console.error("[financeiro/transacoes/[id] GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT /api/financeiro/transacoes/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const b = await req.json()
    console.log("[financeiro/transacoes/[id] PUT] id:", id, "body:", JSON.stringify(b))

    if (!["receita", "despesa"].includes(b.type)) {
      return NextResponse.json({ error: "type deve ser 'receita' ou 'despesa'" }, { status: 400 })
    }

    const [row] = await sql`
      UPDATE transactions SET
        description = ${b.description},
        amount      = ${Number(b.amount)},
        type        = ${b.type},
        category_id = ${b.category_id  ?? null},
        account_id  = ${b.account_id   ?? null},
        obra_id     = ${b.obra_id      ?? null},
        client_id   = ${b.client_id    ?? null},
        due_date    = ${b.due_date     ?? null},
        paid_at     = ${b.paid_at      ?? null},
        status      = ${b.status       ?? "pendente"},
        recurrence  = ${b.recurrence   ?? "unica"},
        notes       = ${b.notes        ?? null},
        updated_at  = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err: any) {
    console.error("[financeiro/transacoes/[id] PUT] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PATCH /api/financeiro/transacoes/[id] — marcar como pago / desfazer pagamento
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const { status, paid_at } = await req.json()
    console.log("[financeiro/transacoes/[id] PATCH] id:", id, "status:", status)

    if (!["pendente", "pago", "cancelado"].includes(status)) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 })
    }

    const [row] = await sql`
      UPDATE transactions
      SET status     = ${status},
          paid_at    = ${paid_at ?? (status === "pago" ? new Date().toISOString() : null)},
          updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err: any) {
    console.error("[financeiro/transacoes/[id] PATCH] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/financeiro/transacoes/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    console.log("[financeiro/transacoes/[id] DELETE] id:", id)

    await sql`UPDATE transactions SET deleted_at = now(), updated_at = now() WHERE id = ${id} AND deleted_at IS NULL`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[financeiro/transacoes/[id] DELETE] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
