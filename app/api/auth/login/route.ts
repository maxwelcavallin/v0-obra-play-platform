import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"
import { SESSION_COOKIE } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 })
    }

    const users = await sql`
      SELECT id, name, email, phone, password_hash
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
        AND is_active = true
        AND deleted_at IS NULL
      LIMIT 1
    `
    const user = users[0]
    if (!user) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })
    }

    // Cria sessão
    const sessions = await sql`
      INSERT INTO sessions (user_id)
      VALUES (${user.id})
      RETURNING token
    `
    const token = sessions[0].token

    // Busca empresas do usuário
    const companies = await sql`
      SELECT c.*
      FROM companies c
      JOIN company_users cu ON cu.company_id = c.id
      WHERE cu.user_id = ${user.id}
        AND c.is_active = true
        AND c.deleted_at IS NULL
      ORDER BY c.fantasy_name
    `

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      companies,
      token,
    })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    // R1: sinaliza ao middleware que o usuário ainda não tem empresa
    if (companies.length === 0) {
      response.cookies.set("op_no_company", "1", {
        httpOnly: false, // lido também pelo cliente
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // expira em 1 dia
        path: "/",
      })
    } else {
      // Garante limpeza caso empresa tenha sido criada entre sessões
      response.cookies.delete("op_no_company")
    }

    return response
  } catch (err) {
    console.error("[auth/login]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
