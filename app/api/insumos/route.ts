import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"
import { INSUMOS_SISTEMA } from "@/lib/insumos-mock"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const company_id = req.nextUrl.searchParams.get("company_id")
    const tab = req.nextUrl.searchParams.get("tab") ?? "sistema" // "sistema" | "meus"

    if (tab === "sistema") {
      return NextResponse.json(INSUMOS_SISTEMA)
    }

    // Meus insumos — personalizados da empresa
    if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
    const rows = await sql`
      SELECT * FROM insumos
      WHERE company_id = ${company_id} AND origin = 'Personalizado'
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[api/insumos GET]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const b = await req.json()
    if (!b.name || !b.unit || !b.category) {
      return NextResponse.json({ error: "Nome, unidade e categoria são obrigatórios" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO insumos (name, unit, category, internal_code, description, origin, company_id)
      VALUES (
        ${b.name.trim()}, ${b.unit}, ${b.category},
        ${b.internal_code ?? null}, ${b.description ?? null},
        'Personalizado', ${b.company_id}
      )
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    console.error("[api/insumos POST]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
