import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { del } from "@vercel/blob"

export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const { id, docId } = await params
  const rows = await sql`
    SELECT file_url FROM obra_documentos WHERE id = ${docId} AND obra_id = ${id}
  `
  if (!rows[0]) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })

  try {
    await del(rows[0].file_url)
  } catch {
    // Se o blob já foi removido, continua
  }

  await sql`DELETE FROM obra_documentos WHERE id = ${docId}`
  return NextResponse.json({ ok: true })
}
