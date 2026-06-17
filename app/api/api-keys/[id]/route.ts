import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// DELETE /api/api-keys/[id] — revoga (não exclui) uma API Key do usuário autenticado
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  const rows = await sql`
    UPDATE api_keys
    SET revoked_at = now()
    WHERE id = ${id}
      AND user_id = ${session.user_id}
      AND revoked_at IS NULL
    RETURNING id
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: "Chave não encontrada ou já revogada" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
