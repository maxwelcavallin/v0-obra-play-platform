import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

async function checkAccess(session: any, companyId: string) {
  const rows = await sql`
    SELECT id FROM company_users
    WHERE company_id = ${companyId} AND user_id = ${session.user_id}
    LIMIT 1
  `
  return rows.length > 0
}

// GET /api/empresas/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    if (!(await checkAccess(session, id))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const rows = await sql`SELECT * FROM companies WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`
    if (!rows[0]) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("[GET /api/empresas/:id]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT /api/empresas/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    if (!(await checkAccess(session, id))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    const body = await req.json()
    const { fantasy_name, company_name, cnpj, logo_url, zipcode, street, number, complement,
            neighbourhood, city, state, whatsapp, email, instagram, website } = body

    const rows = await sql`
      UPDATE companies SET
        fantasy_name = ${fantasy_name},
        company_name = ${company_name ?? null},
        cnpj = ${cnpj ?? null},
        logo_url = ${logo_url ?? null},
        zipcode = ${zipcode ?? null},
        street = ${street ?? null},
        number = ${number ?? null},
        complement = ${complement ?? null},
        neighbourhood = ${neighbourhood ?? null},
        city = ${city ?? null},
        state = ${state ?? null},
        whatsapp = ${whatsapp ?? null},
        email = ${email ?? null},
        instagram = ${instagram ?? null},
        website = ${website ?? null},
        updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("[PUT /api/empresas/:id]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/empresas/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    if (!(await checkAccess(session, id))) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

    await sql`UPDATE companies SET deleted_at = now(), is_active = false WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/empresas/:id]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
