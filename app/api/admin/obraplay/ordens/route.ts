import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  obraplay_order_code: "oc.obraplay_order_code",
  supplier_name:       "oc.supplier_name",
  company_name:        "co.fantasy_name",
  cotacao_identifier:  "c.identifier",
  total:               "oc.total",
  created_at:          "oc.created_at",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q        = searchParams.get("q")       ?? ""
  const syncErr  = searchParams.get("sync_err") ?? "" // "yes" | ""
  const daysRaw  = searchParams.get("days")
  const days     = daysRaw === "todos" ? null : Math.max(1, Number(daysRaw ?? 15))
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per      = 50
  const orderBy  = buildOrderBy(
    searchParams.get("sort"),
    searchParams.get("dir"),
    { columns: SORT, defaultOrder: "oc.created_at DESC" }
  )

  // ordens_compra não tem company_id nem status — chegamos à empresa via cotacoes
  const rows = await db.query(
    `SELECT
       oc.id,
       oc.obraplay_order_code,
       oc.obraplay_order_id,
       oc.obraplay_sync_error,
       oc.supplier_name,
       oc.supplier_email,
       oc.total,
       oc.payment_method,
       oc.created_at,
       c.identifier       AS cotacao_identifier,
       c.id               AS cotacao_id,
       co.fantasy_name    AS company_name,
       CASE WHEN oc.obraplay_sync_error IS NOT NULL THEN 'Erro sync'
            WHEN oc.obraplay_order_code IS NOT NULL THEN 'Enviada ao fornecedor'
            ELSE 'Pendente'
       END AS status,
       COUNT(*) OVER() AS total_count
     FROM ordens_compra oc
     LEFT JOIN cotacoes    c  ON c.id  = oc.cotacao_id
     LEFT JOIN companies   co ON co.id = c.company_id
     WHERE ($1 = '' OR oc.supplier_name ILIKE $2
                    OR co.fantasy_name  ILIKE $2
                    OR oc.obraplay_order_code ILIKE $2
                    OR c.identifier ILIKE $2)
       AND ($3 = '' OR ($3 = 'yes' AND oc.obraplay_sync_error IS NOT NULL))
       AND ($4::int IS NULL OR oc.created_at >= NOW() - ($4::int || ' days')::interval)
     ORDER BY ${orderBy}
     LIMIT $5 OFFSET $6`,
    [q, `%${q}%`, syncErr, days, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per, days: days ?? "todos" })
}
