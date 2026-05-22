import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const rows = await sql`
      SELECT o.*,
        COALESCE(c.full_name, c.fantasy_name, c.company_name) AS client_name,
        c.type AS client_type
      FROM obras o
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.id = ${id}
      LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    const b = await req.json()
    const rows = await sql`
      UPDATE obras SET
        client_id = ${b.client_id ?? null},
        is_own = ${b.is_own ?? false},
        name = ${b.name},
        status = ${b.status},
        type = ${b.type ?? null},
        area_m2 = ${b.area_m2 ?? null},
        start_date = ${b.start_date ?? null},
        expected_end_date = ${b.expected_end_date ?? null},
        delivery_zipcode = ${b.delivery_zipcode ?? null},
        delivery_street = ${b.delivery_street ?? null},
        delivery_number = ${b.delivery_number ?? null},
        delivery_complement = ${b.delivery_complement ?? null},
        delivery_neighbourhood = ${b.delivery_neighbourhood ?? null},
        delivery_city = ${b.delivery_city ?? null},
        delivery_state = ${b.delivery_state ? String(b.delivery_state).slice(0,2) : null},
        same_billing_address = ${b.same_billing_address ?? true},
        billing_zipcode = ${b.billing_zipcode ?? null},
        billing_street = ${b.billing_street ?? null},
        billing_number = ${b.billing_number ?? null},
        billing_complement = ${b.billing_complement ?? null},
        billing_neighbourhood = ${b.billing_neighbourhood ?? null},
        billing_city = ${b.billing_city ?? null},
        billing_state = ${b.billing_state ? String(b.billing_state).slice(0,2) : null},
        notes = ${b.notes ?? null},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(rows[0])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { id } = await params
    await sql`DELETE FROM obras WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
