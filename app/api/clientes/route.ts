import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

// GET /api/clientes?company_id=...
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const companyId = req.nextUrl.searchParams.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const clients = await sql`
      SELECT * FROM clients
      WHERE company_id = ${companyId}
        AND deleted_at IS NULL
      ORDER BY COALESCE(full_name, fantasy_name)
    `
    return NextResponse.json(clients)
  } catch (err) {
    console.error("[GET /api/clientes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/clientes
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const b = await req.json()
    const rows = await sql`
      INSERT INTO clients (
        company_id, type, full_name, fantasy_name, company_name, cpf, cnpj,
        birth_date, responsible_name, phone, whatsapp, email, instagram,
        zipcode, street, number, complement, neighbourhood, city, state, notes, status
      ) VALUES (
        ${b.company_id}, ${b.type}, ${b.full_name ?? null}, ${b.fantasy_name ?? null},
        ${b.company_name ?? null}, ${b.cpf ?? null}, ${b.cnpj ?? null},
        ${b.birth_date ?? null}, ${b.responsible_name ?? null}, ${b.phone ?? null},
        ${b.whatsapp ?? null}, ${b.email ?? null}, ${b.instagram ?? null},
        ${b.zipcode ?? null}, ${b.street ?? null}, ${b.number ?? null},
        ${b.complement ?? null}, ${b.neighbourhood ?? null}, ${b.city ?? null},
        ${b.state ?? null}, ${b.notes ?? null}, ${b.status ?? 'ativo'}
      )
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error("[POST /api/clientes]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
