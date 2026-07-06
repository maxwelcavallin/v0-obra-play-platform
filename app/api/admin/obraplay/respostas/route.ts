import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50

  const rows = await db`
    SELECT DISTINCT ON (cr.cotacao_id, cr.op_answer_id)
      cr.cotacao_id, cr.op_answer_id, cr.cotacao_identifier,
      cr.supplier_name, cr.supplier_city,
      cr.payment_method, cr.arrival_estimate, cr.answered_at,
      cr.cotacao_fornecedor_id,
      COUNT(*) OVER(PARTITION BY cr.cotacao_id, cr.op_answer_id) AS item_count,
      COUNT(*) OVER() AS total_count
    FROM cotacao_respostas cr
    WHERE (${q} = '' OR cr.cotacao_identifier ILIKE ${'%' + q + '%'} OR cr.supplier_name ILIKE ${'%' + q + '%'})
    ORDER BY cr.cotacao_id, cr.op_answer_id, cr.answered_at DESC
    LIMIT ${per} OFFSET ${(page - 1) * per}
  `

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
