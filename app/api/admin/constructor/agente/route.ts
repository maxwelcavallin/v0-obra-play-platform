import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

// ID do usuário agente IA provisionado (conforme documentação)
const AGENTE_USER_ID = "8944a3c1-563e-47fa-838d-c0042918a76f"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)

  const [user] = await db`
    SELECT id, name, email, is_active FROM users WHERE id = ${AGENTE_USER_ID}
  `

  if (!user) return NextResponse.json({ agente: null })

  const apiKeys = await db`
    SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE user_id = ${AGENTE_USER_ID}
    ORDER BY created_at DESC
  `

  return NextResponse.json({
    agente: {
      user_id: user.id,
      name: user.name,
      email: user.email,
      is_active: user.is_active,
      api_keys: apiKeys,
    },
  })
}
