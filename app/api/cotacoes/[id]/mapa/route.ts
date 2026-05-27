import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { obraplay } from "@/lib/obraplay-client"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params

  const [cotacao] = await sql`
    SELECT c.*, o.name AS obra_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    WHERE c.id = ${id}
  `
  if (!cotacao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  const items    = await sql`SELECT * FROM cotacao_itens WHERE cotacao_id = ${id} ORDER BY created_at`
  const suppliers = await sql`SELECT * FROM cotacao_fornecedores WHERE cotacao_id = ${id} ORDER BY is_recommended DESC, created_at`

  // Busca respostas do ObraPlay se houver quotation_id
  let answers: any[] = []
  if (cotacao.obraplay_quotation_id) {
    try {
      answers = await obraplay.quotations.getAnswers(cotacao.obraplay_quotation_id)
    } catch { /* silencia — retorna estrutura local */ }
  }

  // Monta mapa: para cada fornecedor, cruzamos com a resposta do ObraPlay
  const supplierMap = suppliers.map((sup: any) => {
    // Tenta encontrar a resposta do ObraPlay pelo mirror_company_id ou pelo nome
    const answer = answers.find((a: any) =>
      (sup.mirror_company_id && a.company?.id === sup.mirror_company_id) ||
      a.name?.toLowerCase() === sup.supplier_name?.toLowerCase()
    )

    // Monta itens com preços respondidos
    const answeredItems = items.map((item: any) => {
      const ai = answer?.answered_items?.find((ai: any) => {
        // Tenta casar por nome ou posição
        return ai.name?.toLowerCase() === item.name?.toLowerCase()
      })
      return {
        cotacao_item_id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: Number(item.quantity),
        answered: ai?.answered ?? false,
        available: ai?.available ?? false,
        unit_price: ai?.unit_price_micros != null ? ai.unit_price_micros / 1_000_000 : null,
        total_price: ai?.total_quantity_micros != null && ai?.unit_price_micros != null
          ? (ai.total_quantity_micros / 1_000_000) * (ai.unit_price_micros / 1_000_000)
          : null,
      }
    })

    // Totais
    const subtotal = answeredItems.reduce((s: number, i: any) => s + (i.total_price ?? 0), 0)
    const shippingAddr = answer?.answered_shipping_addresses?.[0]
    const freight = shippingAddr?.freight ?? (shippingAddr?.free_shipping ? 0 : null)
    const total = freight != null ? subtotal + freight : subtotal

    return {
      supplier_id:    sup.id,
      supplier_name:  sup.supplier_name,
      supplier_city:  sup.supplier_city,
      supplier_email: sup.supplier_email,
      supplier_phone: sup.supplier_phone,
      is_recommended: sup.is_recommended,
      mirror_company_id: sup.mirror_company_id,
      obraplay_answer_id: answer?.id ?? null,
      answered:       !!answer,
      payment_method: answer?.payment_method ?? null,
      arrival_estimate: answer?.arrival_estimate ?? null,
      valid_until:    answer?.valid_until ?? null,
      observations:   answer?.observations ?? null,
      answered_items: answeredItems,
      subtotal,
      freight,
      total,
    }
  })

  return NextResponse.json({
    cotacao_id: id,
    identifier: cotacao.identifier,
    obraplay_quotation_code: cotacao.obraplay_quotation_code,
    obra_name: cotacao.obra_name,
    status: cotacao.status,
    items: items.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, quantity: Number(i.quantity) })),
    suppliers: supplierMap,
  })
}
