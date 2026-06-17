import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"
import { generateApiKey } from "@/lib/api-key"

// GET /api/api-keys — lista as API Keys do usuário autenticado (nunca retorna o valor em texto puro)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const keys = await sql`
    SELECT id, name, key_prefix, last_used_at, revoked_at, created_at
    FROM api_keys
    WHERE user_id = ${session.user_id}
    ORDER BY created_at DESC
  `
  return NextResponse.json({ keys })
}

// POST /api/api-keys — cria uma nova API Key. Retorna o valor em texto puro UMA única vez.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = (body?.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Informe um nome para a chave" }, { status: 400 })

  const { plaintext, hash, prefix } = generateApiKey()

  const rows = await sql`
    INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
    VALUES (${session.user_id}, ${name}, ${prefix}, ${hash})
    RETURNING id, name, key_prefix, created_at
  `

  return NextResponse.json(
    {
      ...rows[0],
      // ATENÇÃO: o campo `key` só é retornado aqui, neste momento. Guarde-o com segurança.
      key: plaintext,
    },
    { status: 201 },
  )
}
