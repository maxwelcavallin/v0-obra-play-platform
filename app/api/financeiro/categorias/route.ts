import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/categorias?company_id=
export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const companyId = req.nextUrl.searchParams.get("company_id")
    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

    const rows = await sql`
      SELECT id, name, type, color,
             (SELECT COUNT(*) FROM transactions t
              WHERE t.category_id = transaction_categories.id
                AND t.deleted_at IS NULL) AS usage_count
      FROM transaction_categories
      WHERE company_id = ${companyId}
        AND deleted_at IS NULL
      ORDER BY type, name
    `
    console.log("[financeiro/categorias GET] rows:", rows.length)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[financeiro/categorias GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/financeiro/categorias
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { company_id, name, type, color } = await req.json()
    console.log("[financeiro/categorias POST]", { company_id, name, type, color })

    if (!company_id || !name || !type) {
      return NextResponse.json({ error: "company_id, name e type são obrigatórios" }, { status: 400 })
    }
    if (!["receita", "despesa"].includes(type)) {
      return NextResponse.json({ error: "type deve ser 'receita' ou 'despesa'" }, { status: 400 })
    }

    // Impede duplicata de nome por empresa/tipo
    const [existing] = await sql`
      SELECT id FROM transaction_categories
      WHERE company_id = ${company_id} AND name = ${name} AND type = ${type} AND deleted_at IS NULL
    `
    if (existing) {
      return NextResponse.json({ error: "Já existe uma categoria com este nome e tipo." }, { status: 409 })
    }

    const [row] = await sql`
      INSERT INTO transaction_categories (company_id, name, type, color)
      VALUES (${company_id}, ${name}, ${type}, ${color ?? null})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (err: any) {
    console.error("[financeiro/categorias POST] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
