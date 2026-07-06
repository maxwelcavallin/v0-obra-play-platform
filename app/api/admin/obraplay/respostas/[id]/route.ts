import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  // id = cotacao_fornecedor_id
  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const itens = await db`
    SELECT cr.*
    FROM cotacao_respostas cr
    WHERE cr.cotacao_fornecedor_id = ${id}
    ORDER BY cr.item_name
  `

  if (itens.length === 0) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  const first = itens[0]
  const resposta = {
    cotacao_id:         first.cotacao_id,
    cotacao_identifier: first.cotacao_identifier,
    op_answer_id:       first.op_answer_id,
    supplier_name:      first.supplier_name,
    supplier_city:      first.supplier_city,
    supplier_email:     first.supplier_email,
    supplier_phone:     first.supplier_phone,
    payment_method:     first.payment_method,
    arrival_estimate:   first.arrival_estimate,
    valid_until:        first.valid_until,
    answered_at:        first.answered_at,
    observations:       first.observations,
    itens,
  }

  return NextResponse.json(resposta)
}
