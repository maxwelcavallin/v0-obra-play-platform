import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = req.nextUrl.searchParams.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const db = neon(process.env.DATABASE_URL!)
    const rows = await db`
      SELECT id, type, title, description, entity_type, entity_id, read_at, created_at
      FROM notifications
      WHERE company_id = ${companyId}
        AND (user_id = ${session.user_id} OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 50
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error("[notifications GET]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
