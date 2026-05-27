import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "noreply@obraplay.com.br"
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "ObraPlay"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://v0-obra-play-platform.vercel.app"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 })
    }

    // Busca o usuário — retorno genérico independente de existir ou não (segurança)
    const users = await sql`
      SELECT id, name, email FROM users WHERE email = ${email.toLowerCase().trim()} AND is_active = true LIMIT 1
    `

    if (users.length > 0) {
      const user = users[0]

      // Gera token seguro de 64 bytes (128 chars hex)
      const token = crypto.randomBytes(64).toString("hex")

      // Invalida tokens anteriores desse usuário
      await sql`
        UPDATE password_reset_tokens SET used_at = now()
        WHERE user_id = ${user.id} AND used_at IS NULL AND expires_at > now()
      `

      // Insere novo token
      await sql`
        INSERT INTO password_reset_tokens (user_id, token)
        VALUES (${user.id}, ${token})
      `

      const resetLink = `${APP_URL}/redefinir-senha/${token}`

      // Envia e-mail transacional via Brevo (template ID 408)
      if (BREVO_API_KEY) {
        const brevoPayload = {
          sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
          to: [{ email: user.email, name: user.name ?? user.email }],
          templateId: 408,
          params: { TOKEN: resetLink },
        }
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify(brevoPayload),
        })

        if (!brevoRes.ok) {
          const brevoBody = await brevoRes.json().catch(() => ({}))
          const msg = brevoBody?.message ?? "Erro ao enviar e-mail."
          return NextResponse.json({ error: msg }, { status: 500 })
        }
      }
    }

    // Sempre retorna sucesso para não vazar se o e-mail existe
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[recuperar-senha]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
