import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// PUT — atualiza role/status/perfil
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; uid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id: companyId, uid } = await params
    const { role, status, profile_id } = await req.json()

    const rows = await sql`
      UPDATE company_users SET
        role = COALESCE(${role ?? null}, role),
        status = COALESCE(${status ?? null}, status),
        profile_id = COALESCE(${profile_id ?? null}, profile_id),
        updated_at = now()
      WHERE id = ${uid} AND company_id = ${companyId}
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("[PUT usuario]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE — remove usuário da empresa
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; uid: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id: companyId, uid } = await params

    await sql`DELETE FROM company_users WHERE id = ${uid} AND company_id = ${companyId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE usuario]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
