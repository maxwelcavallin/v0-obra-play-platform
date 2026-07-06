import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)

  const rows = await db`
    SELECT
      i.id, i.name, i.unit, i.category, i.internal_code, i.created_at,
      co.fantasy_name AS company_name
    FROM insumos i
    LEFT JOIN companies co ON co.id = i.company_id
    ORDER BY i.name ASC
    LIMIT 500
  `

  return NextResponse.json({ insumos: rows })
}
