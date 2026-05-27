import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const { id } = await params
  const b = await req.json()

  const [updated] = await sql`
    UPDATE cotacoes SET
      draft_payload = ${JSON.stringify(b.draft_payload ?? b)},
      need_date     = ${b.need_date ?? null},
      expiry_date   = ${b.expiry_date ?? null},
      general_notes = ${b.general_notes ?? null},
      obra_id       = ${b.obra_id ?? null},
      updated_at    = now()
    WHERE id = ${id} AND status = 'Rascunho'
    RETURNING id, status, updated_at
  `

  if (!updated) return NextResponse.json({ error: "Rascunho não encontrado" }, { status: 404 })
  return NextResponse.json(updated)
}
