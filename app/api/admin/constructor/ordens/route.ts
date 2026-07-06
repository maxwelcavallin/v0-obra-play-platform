import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)

  const rows = await db`
    SELECT
      oc.id, oc.code, oc.status, oc.total, oc.created_at,
      oc.supplier_name,
      co.fantasy_name AS company_name, co.id AS company_id
    FROM ordens_compra oc
    LEFT JOIN cotacoes cot ON cot.id = oc.cotacao_id
    LEFT JOIN companies co ON co.id = cot.company_id
    ORDER BY oc.created_at DESC
    LIMIT 200
  `

  return NextResponse.json({ ordens: rows })
}
