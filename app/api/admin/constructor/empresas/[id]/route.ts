import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [empresa] = await db`SELECT * FROM companies WHERE id = ${id}`
  if (!empresa) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  const usuarios = await db`
    SELECT cu.role, cu.status, cu.is_admin, cu.created_at,
           u.id, u.name, u.email, u.is_active
    FROM company_users cu
    JOIN users u ON u.id = cu.user_id
    WHERE cu.company_id = ${id}
    ORDER BY cu.is_admin DESC, u.name
  `

  const cotacoes = await db`
    SELECT c.id, c.identifier, c.status, c.created_at,
           COUNT(ci.id) AS item_count
    FROM cotacoes c
    LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
    WHERE c.company_id = ${id}
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT 20
  `

  return NextResponse.json({ empresa, usuarios, cotacoes })
}
