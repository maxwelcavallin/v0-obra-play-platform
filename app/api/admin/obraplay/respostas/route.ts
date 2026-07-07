import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  supplier_name:      "supplier_name",
  supplier_city:      "supplier_city",
  cotacao_identifier: "cotacao_identifier",
  answered_at:        "answered_at",
  payment_method:     "payment_method",
  item_count:         "item_count",
  company_name:       "company_name",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q       = searchParams.get("q")    ?? ""
  const daysRaw = searchParams.get("days")
  const days    = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page    = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per     = 50
  const orderBy = buildOrderBy(
    searchParams.get("sort"),
    searchParams.get("dir"),
    { columns: SORT, defaultOrder: "answered_at DESC NULLS LAST" }
  )

  // Agrupa por (cotacao_id, op_answer_id) para ter 1 linha por resposta de fornecedor
  // com a contagem real de itens dessa resposta
  const rows = await db.query(
    `SELECT
       cr.cotacao_id,
       cr.op_answer_id,
       cr.cotacao_identifier,
       cr.supplier_name,
       cr.supplier_city,
       cr.supplier_email,
       cr.supplier_foreign_id,
       cr.payment_method,
       cr.arrival_estimate,
       cr.answered_at,
       cr.cotacao_fornecedor_id,
       co.fantasy_name              AS company_name,
       COUNT(cr.id)::int            AS item_count,
       SUM(cr.total_quantity_micros) AS total_quantity_sum,
       COUNT(*) OVER()              AS total_count
     FROM cotacao_respostas cr
     LEFT JOIN cotacoes  c  ON c.id  = cr.cotacao_id
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE ($1 = '' OR cr.cotacao_identifier ILIKE $2
                    OR cr.supplier_name      ILIKE $2
                    OR co.fantasy_name       ILIKE $2)
       AND ($3::int IS NULL OR cr.created_at >= NOW() - ($3::int || ' days')::interval)
     GROUP BY
       cr.cotacao_id, cr.op_answer_id, cr.cotacao_identifier,
       cr.supplier_name, cr.supplier_city, cr.supplier_email,
       cr.supplier_foreign_id, cr.payment_method, cr.arrival_estimate,
       cr.answered_at, cr.cotacao_fornecedor_id, co.fantasy_name
     ORDER BY ${orderBy}
     LIMIT $4 OFFSET $5`,
    [q, `%${q}%`, days, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per, days: days ?? "todos" })
}
