import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const { id } = await params
  const docs = await sql`
    SELECT * FROM obra_documentos WHERE obra_id = ${id} ORDER BY created_at DESC
  `
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try {
    session = await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const { name, file_url, file_type, file_size } = body
  if (!name || !file_url || !file_type) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }
  const rows = await sql`
    INSERT INTO obra_documentos (obra_id, name, file_url, file_type, file_size, uploaded_by)
    VALUES (${id}, ${name}, ${file_url}, ${file_type}, ${file_size ?? null}, ${session.user_id})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
