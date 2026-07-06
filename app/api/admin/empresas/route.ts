import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { logAdminAction } from "@/lib/admin-audit"

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const [u] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  return !!u?.is_platform_admin
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!(await requireAdmin(session))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = 20
  const offset = (page - 1) * limit

  const rows = await sql`
    SELECT
      c.id, c.fantasy_name, c.company_name, c.cnpj, c.city, c.state,
      c.email, c.phone_primary, c.created_at,
      COUNT(DISTINCT cu.user_id)::int AS user_count,
      COUNT(DISTINCT ct.id)::int      AS cotacao_count
    FROM companies c
    LEFT JOIN company_users cu ON cu.company_id = c.id
    LEFT JOIN cotacoes ct      ON ct.company_id = c.id
    WHERE (${search} = ''
           OR c.fantasy_name ILIKE ${'%' + search + '%'}
           OR c.company_name ILIKE ${'%' + search + '%'}
           OR c.cnpj         ILIKE ${'%' + search + '%'})
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM companies
    WHERE (${search} = ''
           OR fantasy_name ILIKE ${'%' + search + '%'}
           OR company_name ILIKE ${'%' + search + '%'}
           OR cnpj         ILIKE ${'%' + search + '%'})
  `

  return NextResponse.json({ rows, total, page, limit })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!(await requireAdmin(session))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const { companyId, action } = await req.json()
  if (!companyId || !action) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  // Bloquear/desbloquear empresa desativa/reativa todos os usuários vinculados
  const active = action === "reativar"
  await sql`
    UPDATE users SET is_active = ${active}
    WHERE id IN (SELECT user_id FROM company_users WHERE company_id = ${companyId})
  `

  await logAdminAction({
    adminId:    session!.user_id,
    adminName:  session!.name,
    action:     active ? "Empresa reativada" : "Empresa bloqueada",
    entityType: "company",
    entityId:   companyId,
  })

  return NextResponse.json({ ok: true })
}
