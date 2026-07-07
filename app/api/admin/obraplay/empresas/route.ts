import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"
import { buildOrderBy } from "@/lib/admin-sort"

const SORT: Record<string, string> = {
  short_name:                  "mc.short_name",
  city:                        "mc.city",
  registration_type:           "CASE WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 0 WHEN mc.verified_cnpj THEN 1 ELSE 2 END",
  finalized_answers_count:     "mc.finalized_answers_count",
  avg_response_time_minutes:   "mc.avg_response_time_minutes",
  last_sync_at:                "mc.last_sync_at",
  verified_cnpj:               "mc.verified_cnpj",
  has_confirmed_address:       "mc.has_confirmed_address",
  has_confirmed_shipping:      "mc.has_confirmed_shipping",
}

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const nivel = searchParams.get("nivel") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const per = 50
  const orderBy = buildOrderBy(searchParams.get("sort"), searchParams.get("dir"), { columns: SORT, defaultOrder: "mc.last_sync_at DESC NULLS LAST, mc.short_name ASC" })

  const rows = await db(
    `SELECT mc.company_id, mc.short_name, mc.full_name, mc.city, mc.state,
      mc.verified_cnpj, mc.has_confirmed_address, mc.has_confirmed_shipping,
      mc.has_confirmed_configuration, mc.rating, mc.total_reviews,
      mc.avg_response_time_minutes, mc.finalized_answers_count,
      mc.last_sync_at,
      CASE
        WHEN mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping THEN 'certified'
        WHEN mc.verified_cnpj THEN 'validated'
        ELSE 'basic'
      END AS registration_type,
      COUNT(*) OVER() AS total_count
    FROM mirror_companies mc
    WHERE mc.has_confirmed_configuration = true
      AND ($1 = '' OR mc.short_name ILIKE $2 OR mc.full_name ILIKE $2)
      AND ($3 = '' OR
        ($3 = 'certified' AND mc.verified_cnpj AND mc.has_confirmed_address AND mc.has_confirmed_shipping) OR
        ($3 = 'validated' AND mc.verified_cnpj AND NOT (mc.has_confirmed_address AND mc.has_confirmed_shipping)) OR
        ($3 = 'basic' AND NOT mc.verified_cnpj)
      )
    ORDER BY ${orderBy}
    LIMIT $4 OFFSET $5`,
    [q, `%${q}%`, nivel, per, (page - 1) * per]
  )

  const total = rows[0] ? Number(rows[0].total_count) : 0
  return NextResponse.json({ rows, total, page, per })
}
