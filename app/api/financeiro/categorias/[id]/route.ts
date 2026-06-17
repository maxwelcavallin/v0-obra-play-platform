import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// PUT /api/financeiro/categorias/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const { name, type, color } = await req.json()
    console.log("[financeiro/categorias/[id] PUT] id:", id, { name, type, color })

    if (!name || !type) return NextResponse.json({ error: "name e type são obrigatórios" }, { status: 400 })

    const [row] = await sql`
      UPDATE transaction_categories
      SET name = ${name}, type = ${type}, color = ${color ?? null}, updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err: any) {
    console.error("[financeiro/categorias/[id] PUT] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/financeiro/categorias/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    console.log("[financeiro/categorias/[id] DELETE] id:", id)

    // Não permite deletar se houver transações vinculadas
    const [usage] = await sql`
      SELECT COUNT(*)::int AS cnt FROM transactions
      WHERE category_id = ${id} AND deleted_at IS NULL
    `
    if ((usage?.cnt ?? 0) > 0) {
      return NextResponse.json({
        error: `Não é possível excluir: ${usage.cnt} transação(ões) usam esta categoria. Remova o vínculo antes de excluir.`
      }, { status: 400 })
    }

    await sql`UPDATE transaction_categories SET deleted_at = now() WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[financeiro/categorias/[id] DELETE] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
