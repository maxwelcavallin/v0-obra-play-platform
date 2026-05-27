import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { searchParams } = req.nextUrl
  const company_id = searchParams.get("company_id")
  if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const rows = await sql`
    SELECT oc.*,
      c.identifier AS cotacao_identifier,
      c.obraplay_quotation_code,
      o.name AS obra_name
    FROM ordens_compra oc
    LEFT JOIN cotacoes c ON c.id = oc.cotacao_id
    LEFT JOIN obras o ON o.id = c.obra_id
    WHERE oc.company_id = ${company_id}
    ORDER BY oc.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const b = await req.json()
  const { company_id, cotacao_id, supplier_name, supplier_cnpj, supplier_email, supplier_phone,
    items, subtotal, freight, total, payment_method, arrival_estimate, obraplay_answer_id } = b

  if (!company_id || !cotacao_id || !supplier_name) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  // Gera identificador OC-XXXXXX
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  const identifier = `OC-${rand}`

  const [oc] = await sql`
    INSERT INTO ordens_compra
      (company_id, cotacao_id, identifier, supplier_name, supplier_cnpj, supplier_email,
       supplier_phone, items, subtotal, freight, total, payment_method, arrival_estimate,
       obraplay_answer_id, status)
    VALUES
      (${company_id}, ${cotacao_id}, ${identifier}, ${supplier_name}, ${supplier_cnpj ?? null},
       ${supplier_email ?? null}, ${supplier_phone ?? null}, ${JSON.stringify(items ?? [])},
       ${subtotal ?? 0}, ${freight ?? 0}, ${total ?? 0}, ${payment_method ?? null},
       ${arrival_estimate ?? null}, ${obraplay_answer_id ?? null}, 'Aguardando fornecedor')
    RETURNING *
  `
  return NextResponse.json(oc, { status: 201 })
}
