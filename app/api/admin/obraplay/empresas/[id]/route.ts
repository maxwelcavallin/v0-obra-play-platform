import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [empresa] = await db`
    SELECT mc.*,
      CASE
        WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 'certified'
        WHEN mc.verified_cnpj THEN 'validated'
        ELSE 'basic'
      END AS registration_type
    FROM mirror_companies mc
    WHERE mc.company_id = ${Number(id)}
  `
  if (!empresa) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const membros = await db`
    SELECT * FROM mirror_members WHERE company_id = ${Number(id)} ORDER BY name
  `

  const cotacoes_vinculadas = await db`
    SELECT c.identifier, c.status, c.created_at,
           COUNT(ci.id) AS item_count,
           co.fantasy_name AS company_name
    FROM cotacao_fornecedores cf
    JOIN cotacoes c ON c.id = cf.cotacao_id
    LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE cf.mirror_company_id = ${Number(id)}
    GROUP BY c.id, c.identifier, c.status, c.created_at, co.fantasy_name
    ORDER BY c.created_at DESC
    LIMIT 20
  `

  return NextResponse.json({ empresa, membros, cotacoes_vinculadas })
}
