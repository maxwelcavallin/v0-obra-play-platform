import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

// PATCH /api/notifications/[id] — marcar como lida
// PATCH /api/notifications/all — marcar todas como lidas
// DELETE /api/notifications/all — limpar todas
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params
    const db = neon(process.env.DATABASE_URL!)

    if (id === "all") {
      const body = await req.json().catch(() => ({}))
      const companyId = body.company_id
      if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
      await db`
        UPDATE notifications SET read_at = NOW()
        WHERE company_id = ${companyId}
          AND (user_id = ${session.user_id} OR user_id IS NULL)
          AND read_at IS NULL
      `
    } else {
      await db`
        UPDATE notifications SET read_at = NOW()
        WHERE id = ${id}
          AND (user_id = ${session.user_id} OR user_id IS NULL)
      `
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[notifications PATCH]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id } = await params
    const db = neon(process.env.DATABASE_URL!)

    if (id === "all") {
      const companyId = req.nextUrl.searchParams.get("company_id")
      if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
      await db`
        DELETE FROM notifications
        WHERE company_id = ${companyId}
          AND (user_id = ${session.user_id} OR user_id IS NULL)
      `
    } else {
      await db`DELETE FROM notifications WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[notifications DELETE]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
