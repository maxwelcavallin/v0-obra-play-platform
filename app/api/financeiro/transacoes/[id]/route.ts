import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const rows = await sql`SELECT * FROM transactions WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`
    if (!rows[0]) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const b = await req.json()

    const rows = await sql`
      UPDATE transactions SET
        description = ${b.description}, amount = ${b.amount}, type = ${b.type},
        category_id = ${b.category_id ?? null}, client_id = ${b.client_id ?? null},
        due_date = ${b.due_date ?? null}, paid_at = ${b.paid_at ?? null},
        status = ${b.status ?? 'pendente'}, recurrence = ${b.recurrence ?? 'unica'},
        notes = ${b.notes ?? null}, updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    await sql`UPDATE transactions SET deleted_at = now() WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
