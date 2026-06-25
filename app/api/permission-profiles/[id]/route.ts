import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, is_admin, permissions } = body

    const sql = neon(process.env.DATABASE_URL!)
    const [perfil] = await sql`
      SELECT id, company_id, name, is_admin, permissions
      FROM permission_profiles
      WHERE id = ${id}
      LIMIT 1
    `
    if (!perfil) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const [userInCompany] = await sql`
      SELECT cu.is_admin FROM company_users cu
      WHERE cu.company_id = ${perfil.company_id} AND cu.user_id = ${session.user_id}
      LIMIT 1
    `
    if (!userInCompany?.is_admin) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const [updated] = await sql`
      UPDATE permission_profiles SET
        name        = ${name        ?? perfil.name},
        is_admin    = ${is_admin    ?? perfil.is_admin},
        permissions = ${permissions ? JSON.stringify(permissions) : perfil.permissions}
      WHERE id = ${id}
      RETURNING id, company_id, name, is_admin, permissions
    `

    return NextResponse.json(updated)
  } catch (e) {
    console.error("[perfis PUT] erro:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const sql = neon(process.env.DATABASE_URL!)
    const [perfil] = await sql`
      SELECT id, company_id FROM permission_profiles
      WHERE id = ${id}
      LIMIT 1
    `
    if (!perfil) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const [userInCompany] = await sql`
      SELECT cu.is_admin FROM company_users cu
      WHERE cu.company_id = ${perfil.company_id} AND cu.user_id = ${session.user_id}
      LIMIT 1
    `
    if (!userInCompany?.is_admin) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    await sql`DELETE FROM permission_profiles WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[perfis DELETE] erro:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
