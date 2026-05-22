import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// GET /api/empresas — lista empresas do usuário logado
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const companies = await sql`
      SELECT c.*
      FROM companies c
      JOIN company_users cu ON cu.company_id = c.id
      WHERE cu.user_id = ${session.user_id}
        AND c.is_active = true
        AND c.deleted_at IS NULL
      ORDER BY c.fantasy_name
    `
    return NextResponse.json(companies)
  } catch (err) {
    console.error("[GET /api/empresas]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/empresas — cria nova empresa
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const body = await req.json()
    const { fantasy_name, company_name, cnpj, logo_url, zipcode, street, number, complement,
            neighbourhood, city, state, whatsapp, email, instagram, website } = body

    if (!fantasy_name) {
      return NextResponse.json({ error: "Nome fantasia é obrigatório" }, { status: 400 })
    }

    const companies = await sql`
      INSERT INTO companies (
        fantasy_name, company_name, cnpj, logo_url,
        zipcode, street, number, complement, neighbourhood, city, state,
        whatsapp, email, instagram, website
      ) VALUES (
        ${fantasy_name}, ${company_name ?? null}, ${cnpj ?? null}, ${logo_url ?? null},
        ${zipcode ?? null}, ${street ?? null}, ${number ?? null}, ${complement ?? null},
        ${neighbourhood ?? null}, ${city ?? null}, ${state ?? null},
        ${whatsapp ?? null}, ${email ?? null}, ${instagram ?? null}, ${website ?? null}
      )
      RETURNING *
    `
    const company = companies[0]

    // Vincula o usuário como Admin
    await sql`
      INSERT INTO company_users (company_id, user_id, name, email, role, is_admin, is_verified, status)
      VALUES (${company.id}, ${session.user_id}, ${session.name}, ${session.email}, 'Admin', true, true, 'ativo')
    `

    return NextResponse.json(company, { status: 201 })
  } catch (err) {
    console.error("[POST /api/empresas]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
