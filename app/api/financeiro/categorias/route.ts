import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const companyId = req.nextUrl.searchParams.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const rows = await sql`
      SELECT * FROM transaction_categories
      WHERE company_id = ${companyId}
      ORDER BY type, name
    `
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const { company_id, name, type, color } = await req.json()
    if (!company_id || !name || !type) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 })

    const rows = await sql`
      INSERT INTO transaction_categories (company_id, name, type, color)
      VALUES (${company_id}, ${name}, ${type}, ${color ?? null})
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
