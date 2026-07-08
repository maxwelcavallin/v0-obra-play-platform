import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [cotacao] = await db`
    SELECT c.id, c.identifier, c.status, c.need_date, c.expiry_date, c.created_at,
      c.obraplay_quotation_id, c.general_notes,
      co.fantasy_name AS company_name, co.id AS company_id,
      o.name AS obra_name, o.id AS obra_id
    FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    LEFT JOIN obras o ON o.id = c.obra_id
    WHERE c.id = ${id}
  `

  if (!cotacao) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })

  const itens = await db`
    SELECT id, name, unit, quantity FROM cotacao_itens WHERE cotacao_id = ${id} ORDER BY created_at
  `

  const fornecedores = await db`
    SELECT cf.id, cf.supplier_name, cf.supplier_city, cf.mirror_company_id,
      EXISTS(
        SELECT 1 FROM cotacao_respostas cr WHERE cr.cotacao_id = ${id} AND cr.cotacao_fornecedor_id = cf.id
      ) AS has_response
    FROM cotacao_fornecedores cf
    WHERE cf.cotacao_id = ${id}
    ORDER BY cf.supplier_name
  `

  return NextResponse.json({ cotacao, itens, fornecedores })
}
