import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const company_id = req.nextUrl.searchParams.get("company_id")
    if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const rows = await sql`
      SELECT o.*,
        CASE WHEN o.is_own THEN NULL ELSE c.full_name END AS client_name_pf,
        CASE WHEN o.is_own THEN NULL ELSE COALESCE(c.fantasy_name, c.company_name) END AS client_name_pj,
        CASE WHEN o.is_own THEN NULL ELSE c.type END AS client_type
      FROM obras o
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.company_id = ${company_id}
      ORDER BY o.created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[api/obras GET]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const b = await req.json()

    // R2: toda obra precisa de cliente vinculado OU ser obra própria
    if (!b.is_own && !b.client_id) {
      return NextResponse.json(
        { error: "É obrigatório vincular um cliente ou marcar como obra própria." },
        { status: 400 }
      )
    }

    const rows = await sql`
      INSERT INTO obras (
        company_id, client_id, is_own, name, status, type, area_m2,
        start_date, expected_end_date,
        delivery_zipcode, delivery_street, delivery_number, delivery_complement,
        delivery_neighbourhood, delivery_city, delivery_state,
        same_billing_address,
        billing_zipcode, billing_street, billing_number, billing_complement,
        billing_neighbourhood, billing_city, billing_state,
        notes, cover_url, cover_position
      ) VALUES (
        ${b.company_id}, ${b.client_id ?? null}, ${b.is_own ?? false}, ${b.name}, ${b.status ?? "Orçamento"},
        ${b.type ?? null}, ${b.area_m2 ?? null},
        ${b.start_date ?? null}, ${b.expected_end_date ?? null},
        ${b.delivery_zipcode ?? null}, ${b.delivery_street ?? null}, ${b.delivery_number ?? null},
        ${b.delivery_complement ?? null}, ${b.delivery_neighbourhood ?? null},
        ${b.delivery_city ?? null}, ${b.delivery_state ? String(b.delivery_state).slice(0,2) : null},
        ${b.same_billing_address ?? true},
        ${b.billing_zipcode ?? null}, ${b.billing_street ?? null}, ${b.billing_number ?? null},
        ${b.billing_complement ?? null}, ${b.billing_neighbourhood ?? null},
        ${b.billing_city ?? null}, ${b.billing_state ? String(b.billing_state).slice(0,2) : null},
        ${b.notes ?? null}, ${b.cover_url ?? null}, ${b.cover_position ?? "50% 50%"}
      )
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    console.error("[api/obras POST]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
