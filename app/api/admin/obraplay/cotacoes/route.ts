import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  identifier:     "c.identifier",
  company_name:   "co.fantasy_name",
  obra_name:      "o.name",
  status:         "c.status",
  need_date:      "c.need_date",
  created_at:     "c.created_at",
  item_count:     "COUNT(DISTINCT ci.id)",
  supplier_count: "COUNT(DISTINCT cf.id)",
  response_count: "COUNT(DISTINCT cr.op_answer_id)",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const status = searchParams.get("status") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "c.created_at DESC" })

  const rows = await db(
    `SELECT c.id, c.identifier, c.status, c.need_date, c.created_at,
      c.obraplay_quotation_id,
      co.fantasy_name AS company_name,
      o.name AS obra_name,
      COUNT(DISTINCT ci.id) AS item_count,
      COUNT(DISTINCT cf.id) AS supplier_count,
      COUNT(DISTINCT cr.op_answer_id) AS response_count,
      COUNT(*) OVER() AS total_count
    FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
    LEFT JOIN cotacao_fornecedores cf ON cf.cotacao_id = c.id
    LEFT JOIN cotacao_respostas cr ON cr.cotacao_id = c.id
    WHERE ($1 = '' OR c.identifier ILIKE $2 OR co.fantasy_name ILIKE $2)
      AND ($3 = '' OR c.status = $3)
    GROUP BY c.id, co.fantasy_name, o.name
    ORDER BY ${orderBy}
    LIMIT $4 OFFSET $5`,
    [q, `%${q}%`, status, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
