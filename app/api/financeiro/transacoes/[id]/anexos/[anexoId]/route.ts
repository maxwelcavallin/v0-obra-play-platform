import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; anexoId: string }> }) {
  try {
    await requireSession()
    const { id, anexoId } = await params
    console.log("[anexos DELETE] transacao:", id, "anexo:", anexoId)

    await sql`
      UPDATE transaction_attachments
      SET deleted_at = now()
      WHERE id = ${anexoId} AND transaction_id = ${id} AND deleted_at IS NULL
    `
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[anexos DELETE] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
