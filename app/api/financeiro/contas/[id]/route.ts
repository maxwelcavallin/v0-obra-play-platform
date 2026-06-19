import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const b = await req.json()
    console.log("[contas PUT] id:", id)

    const [row] = await sql`
      UPDATE accounts SET
        name            = ${b.name},
        type            = ${b.type ?? "corrente"},
        bank            = ${b.bank ?? null},
        agency          = ${b.agency ?? null},
        account_number  = ${b.account_number ?? null},
        initial_balance = ${Number(b.initial_balance ?? 0)},
        color           = ${b.color ?? null},
        is_active       = ${b.is_active ?? true},
        updated_at      = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err: any) {
    console.error("[contas PUT] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    console.log("[contas DELETE] id:", id)

    const [check] = await sql`SELECT COUNT(*) AS n FROM transactions WHERE account_id = ${id} AND deleted_at IS NULL`
    if (Number(check.n) > 0) {
      return NextResponse.json({ error: "Esta conta possui transações vinculadas e não pode ser excluída." }, { status: 400 })
    }

    await sql`UPDATE accounts SET deleted_at = now() WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[contas DELETE] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
