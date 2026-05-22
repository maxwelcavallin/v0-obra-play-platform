import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// GET — lista usuários da empresa
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id: companyId } = await params

    const users = await sql`
      SELECT * FROM company_users
      WHERE company_id = ${companyId}
      ORDER BY name
    `
    return NextResponse.json(users)
  } catch (err) {
    console.error("[GET usuarios]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST — convida usuário
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id: companyId } = await params
    const { name, email, role } = await req.json()

    if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 })

    const rows = await sql`
      INSERT INTO company_users (company_id, name, email, role, status)
      VALUES (${companyId}, ${name ?? email}, ${email.toLowerCase()}, ${role ?? "Visualizador"}, 'ativo')
      ON CONFLICT (company_id, email) DO UPDATE SET role = EXCLUDED.role, updated_at = now()
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error("[POST usuarios]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
