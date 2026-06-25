'use server'

import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const companyId = params.get("company_id")
    if (!companyId) {
      return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
    }

    // Lista perfis de permissão customizados da empresa
    const perfis = await sql`
      SELECT id, company_id, name, is_admin, permissions
      FROM permission_profiles
      WHERE company_id = ${companyId}
      ORDER BY name ASC
    `

    return NextResponse.json(perfis)
  } catch (e) {
    console.error("[perfis GET] erro:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { company_id, name, is_admin, permissions } = body

    if (!company_id || !name) {
      return NextResponse.json({ error: "name e company_id obrigatórios" }, { status: 400 })
    }

    // Verifica se o usuário é admin da empresa
    const [userInCompany] = await sql`
      SELECT cu.is_admin FROM company_users cu
      WHERE cu.company_id = ${company_id} AND cu.user_id = ${session.user_id}
      LIMIT 1
    `
    if (!userInCompany?.is_admin) {
      return NextResponse.json({ error: "Apenas admins podem criar perfis" }, { status: 403 })
    }

    // Cria novo perfil
    const [perfil] = await sql`
      INSERT INTO permission_profiles (company_id, name, is_admin, permissions)
      VALUES (${company_id}, ${name}, ${is_admin ?? false}, ${JSON.stringify(permissions ?? {})})
      RETURNING id, company_id, name, is_admin, permissions
    `

    return NextResponse.json(perfil, { status: 201 })
  } catch (e) {
    console.error("[perfis POST] erro:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
