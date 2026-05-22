import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// GET /api/auth/perfil — retorna dados do usuário logado
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const rows = await sql`
      SELECT id, name, email, phone, photo_url
      FROM users
      WHERE id = ${session.user_id}
    `
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("[GET /api/auth/perfil]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT /api/auth/perfil — atualiza dados pessoais, foto e/ou senha
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { name, phone, photo_url, current_password, new_password } = await req.json()

    // Se quiser trocar senha, valida a senha atual primeiro
    if (new_password) {
      const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.user_id}`
      const valid = await bcrypt.compare(current_password ?? "", rows[0]?.password_hash ?? "")
      if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
      const hash = await bcrypt.hash(new_password, 12)
      await sql`
        UPDATE users SET name = ${name}, phone = ${phone ?? null},
          photo_url = ${photo_url ?? null}, password_hash = ${hash},
          updated_at = now()
        WHERE id = ${session.user_id}
      `
    } else {
      await sql`
        UPDATE users SET name = ${name}, phone = ${phone ?? null},
          photo_url = ${photo_url ?? null},
          updated_at = now()
        WHERE id = ${session.user_id}
      `
    }

    const updated = await sql`SELECT id, name, email, phone, photo_url FROM users WHERE id = ${session.user_id}`
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error("[PUT /api/auth/perfil]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
