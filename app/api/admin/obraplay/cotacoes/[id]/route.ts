import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [cotacao] = await db`
    SELECT c.*, co.fantasy_name AS company_name, o.name AS obra_name
    FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    LEFT JOIN obras o ON o.id = c.obra_id
    WHERE c.id = ${id}
  `
  if (!cotacao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  const itens = await db`SELECT * FROM cotacao_itens WHERE cotacao_id = ${id} ORDER BY name`

  const fornecedores = await db`
    SELECT cf.*,
      CASE
        WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 'certified'
        WHEN mc.verified_cnpj THEN 'validated'
        ELSE 'basic'
      END AS registration_type,
      cr.op_answer_id IS NOT NULL AS has_response
    FROM cotacao_fornecedores cf
    LEFT JOIN mirror_companies mc ON mc.company_id = cf.mirror_company_id
    LEFT JOIN (SELECT DISTINCT cotacao_fornecedor_id, op_answer_id FROM cotacao_respostas) cr
      ON cr.cotacao_fornecedor_id = cf.id
    WHERE cf.cotacao_id = ${id}
    ORDER BY cf.is_recommended DESC, cf.supplier_name
  `

  return NextResponse.json({ cotacao, itens, fornecedores })
}
