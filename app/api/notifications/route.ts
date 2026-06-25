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

    await db`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id  UUID NOT NULL,
        user_id     UUID,
        type        VARCHAR(50) NOT NULL DEFAULT 'info',
        title       TEXT NOT NULL,
        description TEXT,
        obra_name   TEXT,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    const rows = await db`
      SELECT id, type, title, description, obra_name, read_at, created_at
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
