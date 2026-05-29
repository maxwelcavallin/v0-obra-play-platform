import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { nanoid } from "nanoid"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const { id } = await params

  // Busca cotação original com itens e endereço de entrega
  const [original] = await sql`
    SELECT * FROM cotacoes WHERE id = ${id}
  `
  if (!original) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })

  const originalItems = await sql`
    SELECT * FROM cotacao_itens WHERE cotacao_id = ${id}
  `

  const identifier = nanoid(7).toUpperCase()

  // Cria nova cotação como rascunho copiando apenas as colunas existentes na tabela
  const [nova] = await sql`
    INSERT INTO cotacoes (
      company_id, obra_id, identifier, status,
      need_date, expiry_date, general_notes, address_type, is_public,
      requester_name, requester_email, requester_phone,
      draft_payload
    ) VALUES (
      ${original.company_id},
      ${original.obra_id},
      ${identifier},
      'Rascunho',
      ${original.need_date},
      ${original.expiry_date},
      ${original.general_notes},
      ${original.address_type},
      ${original.is_public},
      ${original.requester_name},
      ${original.requester_email},
      ${original.requester_phone},
      ${JSON.stringify({
        items: originalItems.map((i: any) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          quantity: String(i.quantity),
          insumo_id: i.insumo_id ?? null,
        })),
        need_date: original.need_date,
        expiry_date: original.expiry_date,
        general_notes: original.general_notes,
      })}
    )
    RETURNING *
  `

  // Copia itens
  if (originalItems.length > 0) {
    for (const item of originalItems) {
      await sql`
        INSERT INTO cotacao_itens (cotacao_id, insumo_id, name, unit, quantity)
        VALUES (${nova.id}, ${item.insumo_id}, ${item.name}, ${item.unit}, ${item.quantity})
      `
    }
  }

  return NextResponse.json(nova, { status: 201 })
}
