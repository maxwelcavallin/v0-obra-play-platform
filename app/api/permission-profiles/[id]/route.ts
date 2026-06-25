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

    const db = neon(process.env.DATABASE_URL!)
    const [existing] = await db`
      SELECT id, company_id FROM permission_profiles WHERE id = ${id} LIMIT 1
    `
    if (!existing) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const [userInCompany] = await db`
      SELECT cu.is_admin FROM company_users cu
      WHERE cu.company_id = ${existing.company_id} AND cu.user_id = ${session.user_id}
      LIMIT 1
    `
    if (!userInCompany?.is_admin) {
      return NextResponse.json({ error: "Apenas admins podem editar perfis" }, { status: 403 })
    }

    const [perfil] = await db`
      UPDATE permission_profiles
      SET
        name        = COALESCE(${name ?? null}, name),
        is_admin    = COALESCE(${is_admin ?? null}, is_admin),
        permissions = COALESCE(${permissions ? JSON.stringify(permissions) : null}::jsonb, permissions)
      WHERE id = ${id}
      RETURNING id, company_id, name, is_admin, permissions
    `

    return NextResponse.json(perfil)
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

    const db = neon(process.env.DATABASE_URL!)
    const [existing] = await db`
      SELECT id, company_id FROM permission_profiles WHERE id = ${id} LIMIT 1
    `
    if (!existing) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
    }

    const [userInCompany] = await db`
      SELECT cu.is_admin FROM company_users cu
      WHERE cu.company_id = ${existing.company_id} AND cu.user_id = ${session.user_id}
      LIMIT 1
    `
    if (!userInCompany?.is_admin) {
      return NextResponse.json({ error: "Apenas admins podem deletar perfis" }, { status: 403 })
    }

    await db`DELETE FROM permission_profiles WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[perfis DELETE] erro:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
