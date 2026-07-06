import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""

  const rows = await db`
    SELECT
      c.id, c.identifier, c.status, c.need_date, c.created_at,
      co.fantasy_name AS company_name, co.id AS company_id,
      o.name AS obra_name,
      COUNT(ci.id)::int AS item_count
    FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN cotacao_itens ci ON ci.cotacao_id = c.id
    WHERE (
      ${q} = '' OR
      c.identifier ILIKE ${'%' + q + '%'} OR
      co.fantasy_name ILIKE ${'%' + q + '%'}
    )
    GROUP BY c.id, co.fantasy_name, co.id, o.name
    ORDER BY c.created_at DESC
    LIMIT 200
  `

  return NextResponse.json({ cotacoes: rows })
}
