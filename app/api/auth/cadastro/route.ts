import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"
import { SESSION_COOKIE } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const users = await sql`
      INSERT INTO users (name, email, phone, password_hash)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${phone ?? null}, ${passwordHash})
      RETURNING id, name, email, phone
    `
    const user = users[0]

    const sessions = await sql`
      INSERT INTO sessions (user_id) VALUES (${user.id}) RETURNING token
    `
    const token = sessions[0].token

    const response = NextResponse.json({ user, companies: [] })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return response
  } catch (err) {
    console.error("[auth/cadastro]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
