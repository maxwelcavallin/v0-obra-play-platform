import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  supplier_name:       "sub.supplier_name",
  supplier_city:       "sub.supplier_city",
  cotacao_identifier:  "sub.cotacao_identifier",
  answered_at:         "sub.answered_at",
  payment_method:      "sub.payment_method",
  item_count:          "sub.item_count",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "sub.answered_at DESC NULLS LAST" })

  const rows = await db.query(
    `SELECT * FROM (
      SELECT DISTINCT ON (cr.cotacao_id, cr.op_answer_id)
        cr.cotacao_id, cr.op_answer_id, cr.cotacao_identifier,
        cr.supplier_name, cr.supplier_city,
        cr.payment_method, cr.arrival_estimate, cr.answered_at,
        cr.cotacao_fornecedor_id,
        COUNT(*) OVER(PARTITION BY cr.cotacao_id, cr.op_answer_id) AS item_count,
        COUNT(*) OVER() AS total_count
      FROM cotacao_respostas cr
      WHERE ($1 = '' OR cr.cotacao_identifier ILIKE $2 OR cr.supplier_name ILIKE $2)
      ORDER BY cr.cotacao_id, cr.op_answer_id, cr.answered_at DESC
    ) sub
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`,
    [q, `%${q}%`, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
