import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [usuario] = await db`
    SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at
    FROM users u
    WHERE u.id = ${id}
  `
  if (!usuario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const empresas = await db`
    SELECT co.id, co.fantasy_name, co.company_name, co.cnpj,
           cu.role, cu.status, cu.is_admin, cu.created_at
    FROM company_users cu
    JOIN companies co ON co.id = cu.company_id
    WHERE cu.user_id = ${id}
    ORDER BY cu.created_at DESC
  `

  const cotacoes = await db`
    SELECT c.id, c.identifier, c.status, c.created_at,
           co.fantasy_name AS company_name
    FROM cotacoes c
    JOIN companies co ON co.id = c.company_id
    WHERE c.company_id IN (SELECT company_id FROM company_users WHERE user_id = ${id})
    ORDER BY c.created_at DESC
    LIMIT 10
  `

  return NextResponse.json({ usuario, empresas, cotacoes })
}
