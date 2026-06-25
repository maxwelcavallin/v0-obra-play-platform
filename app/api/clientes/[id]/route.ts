import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, blockAgentDelete } from "@/lib/session"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    // R9: company_id validado — cliente deve pertencer à empresa do contexto
    const companyId = req.nextUrl.searchParams.get("company_id")
    const rows = await sql`
      SELECT * FROM clients
      WHERE id = ${id}
        AND deleted_at IS NULL
        ${companyId ? sql`AND company_id = ${companyId}` : sql``}
      LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const b = await req.json()
    // R9: garante que o cliente pertence à empresa informada
    if (b.company_id) {
      const check = await sql`SELECT id FROM clients WHERE id = ${id} AND company_id = ${b.company_id} AND deleted_at IS NULL`
      if (!check[0]) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const rows = await sql`
      UPDATE clients SET
        type = ${b.type}, full_name = ${b.full_name ?? null},
        fantasy_name = ${b.fantasy_name ?? null}, company_name = ${b.company_name ?? null},
        cpf = ${b.cpf ?? null}, cnpj = ${b.cnpj ?? null}, birth_date = ${b.birth_date ?? null},
        responsible_name = ${b.responsible_name ?? null}, phone = ${b.phone ?? null},
        whatsapp = ${b.whatsapp ?? null}, email = ${b.email ?? null},
        instagram = ${b.instagram ?? null}, zipcode = ${b.zipcode ?? null},
        street = ${b.street ?? null}, number = ${b.number ?? null},
        complement = ${b.complement ?? null}, neighbourhood = ${b.neighbourhood ?? null},
        city = ${b.city ?? null}, state = ${b.state ?? null},
        notes = ${b.notes ?? null}, status = ${b.status ?? 'ativo'},
        updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agentBlock = await blockAgentDelete(); if (agentBlock) return agentBlock
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const companyId = req.nextUrl.searchParams.get("company_id")
    // R7 + R9: soft delete validando company_id
    const result = await sql`
      UPDATE clients SET deleted_at = now()
      WHERE id = ${id}
        AND deleted_at IS NULL
        ${companyId ? sql`AND company_id = ${companyId}` : sql``}
      RETURNING id
    `
    if (!result[0]) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
