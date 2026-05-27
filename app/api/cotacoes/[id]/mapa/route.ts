import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params

  // Cotação + obra
  const [cotacao] = await sql`
    SELECT c.*, o.name AS obra_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    WHERE c.id = ${id}
  `
  if (!cotacao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 })

  // Itens da cotação
  const items = await sql`
    SELECT id, name, unit, quantity, op_item_id
    FROM cotacao_itens
    WHERE cotacao_id = ${id}
    ORDER BY created_at
  `

  // Fornecedores
  const suppliers = await sql`
    SELECT * FROM cotacao_fornecedores
    WHERE cotacao_id = ${id}
    ORDER BY is_recommended DESC, created_at
  `

  // Respostas salvas localmente (do webhook)
  const respostas = await sql`
    SELECT * FROM cotacao_respostas
    WHERE cotacao_id = ${id}
    ORDER BY answered_at ASC
  `

  // Itens respondidos de todas as respostas
  const respostaIds = respostas.map((r: any) => r.id)
  const allAnsweredItems = respostaIds.length > 0
    ? await sql`
        SELECT * FROM cotacao_resposta_itens
        WHERE resposta_id = ANY(${respostaIds}::uuid[])
      `
    : []

  // Fretes de todas as respostas
  const allFretes = respostaIds.length > 0
    ? await sql`
        SELECT * FROM cotacao_resposta_fretes
        WHERE resposta_id = ANY(${respostaIds}::uuid[])
      `
    : []

  // Monta o mapa: para cada fornecedor, cruzamos com a resposta salva no banco
  const supplierMap = suppliers.map((sup: any) => {
    // Casa pelo cotacao_fornecedor_id ou pelo mirror_company_id via supplier_foreign_id
    const resposta = respostas.find((r: any) =>
      r.cotacao_fornecedor_id === sup.id ||
      (sup.mirror_company_id && r.supplier_foreign_id === String(sup.mirror_company_id))
    )

    const answeredItems = items.map((item: any) => {
      let ai: any = null

      if (resposta) {
        // Casa por cotacao_item_id (se op_item_id foi salvo) ou por op_item_id diretamente
        ai = allAnsweredItems.find((a: any) =>
          a.resposta_id === resposta.id &&
          (a.cotacao_item_id === item.id || (item.op_item_id && a.op_item_id === item.op_item_id))
        ) ?? null
      }

      const unitPrice  = ai?.unit_price_micros  != null ? ai.unit_price_micros  / 1_000_000 : null
      const qty        = ai?.total_quantity_micros != null ? ai.total_quantity_micros / 1_000_000 : Number(item.quantity)
      const totalPrice = unitPrice != null ? unitPrice * qty : null

      return {
        cotacao_item_id: item.id,
        op_item_id:      item.op_item_id ?? null,
        name:            item.name,
        unit:            item.unit,
        quantity:        Number(item.quantity),
        answered:        ai?.answered  ?? false,
        available:       ai?.available ?? false,
        unit_price:      unitPrice,
        total_price:     totalPrice,
        discount:        ai?.discount ?? 0,
      }
    })

    const subtotal = answeredItems.reduce((s: number, i: any) => s + (i.total_price ?? 0), 0)

    const frete = resposta
      ? allFretes.find((f: any) => f.resposta_id === resposta.id)
      : null
    const freight = frete?.free_shipping ? 0 : (frete?.freight ?? null)
    const total   = freight != null ? subtotal + freight : subtotal

    return {
      supplier_id:        sup.id,
      supplier_name:      sup.supplier_name,
      supplier_city:      sup.supplier_city,
      supplier_email:     sup.supplier_email,
      supplier_phone:     sup.supplier_phone,
      is_recommended:     sup.is_recommended,
      mirror_company_id:  sup.mirror_company_id,
      op_answer_id:       resposta?.op_answer_id ?? null,
      answered:           !!resposta,
      payment_method:     resposta?.payment_method    ?? null,
      installments:       resposta?.installments      ?? null,
      installments_obs:   resposta?.installments_obs  ?? null,
      arrival_estimate:   resposta?.arrival_estimate  ?? null,
      valid_until:        resposta?.valid_until        ?? null,
      observations:       resposta?.observations      ?? null,
      answered_at:        resposta?.answered_at       ?? null,
      answered_items:     answeredItems,
      subtotal,
      freight,
      total,
    }
  })

  return NextResponse.json({
    cotacao_id:              id,
    identifier:              cotacao.identifier,
    obraplay_quotation_id:   cotacao.obraplay_quotation_id,
    obra_name:               cotacao.obra_name,
    status:                  cotacao.status,
    items: items.map((i: any) => ({
      id:        i.id,
      name:      i.name,
      unit:      i.unit,
      quantity:  Number(i.quantity),
      op_item_id: i.op_item_id ?? null,
    })),
    suppliers: supplierMap,
  })
}
