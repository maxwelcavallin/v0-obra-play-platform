import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres" }, { status: 400 })
    }

    // Busca token válido e não usado
    const rows = await sql`
      SELECT prt.id, prt.user_id
      FROM password_reset_tokens prt
      WHERE prt.token = ${token}
        AND prt.used_at IS NULL
        AND prt.expires_at > now()
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Link inválido ou expirado. Solicite um novo." }, { status: 400 })
    }

    const { id: tokenId, user_id } = rows[0]

    // Atualiza a senha
    const hash = await bcrypt.hash(password, 12)
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${user_id}`

    // Marca token como usado
    await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${tokenId}`

    // Invalida todas as sessões ativas do usuário por segurança
    await sql`DELETE FROM sessions WHERE user_id = ${user_id}`

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[redefinir-senha]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
