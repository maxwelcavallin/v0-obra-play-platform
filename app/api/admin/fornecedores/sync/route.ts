import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { logAdminAction } from "@/lib/admin-audit"

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const [u] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  if (!u?.is_platform_admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  // Aciona o mesmo endpoint de cron para sincronizar
  const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://v0-obra-play-platform.vercel.app"}/api/obraplay/cron`
  const cronRes = await fetch(cronUrl, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  })

  const result = await cronRes.json().catch(() => ({}))

  await logAdminAction({
    adminId:    session.user_id,
    adminName:  session.name,
    action:     "Sync manual de fornecedores disparado",
    entityType: "mirror_companies",
    details:    { status: cronRes.status, result },
  })

  if (!cronRes.ok) {
    return NextResponse.json({ error: "Falha na sincronização", details: result }, { status: 502 })
  }

  return NextResponse.json({ ok: true, result })
}
