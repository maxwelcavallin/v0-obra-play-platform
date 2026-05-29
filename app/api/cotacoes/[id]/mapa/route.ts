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

  // Itens originais da cotação
  const items = await sql`
    SELECT id, name, unit, quantity, op_item_id, insumo_id
    FROM cotacao_itens
    WHERE cotacao_id = ${id}
    ORDER BY created_at
  `

  // Fornecedores convidados
  const suppliers = await sql`
    SELECT id, supplier_name, supplier_city, supplier_email, supplier_phone,
           is_recommended, mirror_company_id, op_answer_id, op_answer_key
    FROM cotacao_fornecedores
    WHERE cotacao_id = ${id}
    ORDER BY is_recommended DESC, created_at
  `

  // Todas as linhas da tabela desnormalizada para esta cotação
  const respostas = await sql`
    SELECT * FROM cotacao_respostas
    WHERE cotacao_id = ${id}
    ORDER BY answered_at ASC NULLS LAST
  `

  // Monta o mapa: um bloco por fornecedor
  const supplierMap = suppliers.map((sup: any) => {
    // Linhas desta resposta: casa por cotacao_fornecedor_id ou por mirror_company_id
    const linhas = respostas.filter((r: any) =>
      r.cotacao_fornecedor_id === sup.id ||
      (sup.mirror_company_id != null && toInt(r.mirror_company_id) === sup.mirror_company_id) ||
      (sup.op_answer_id       != null && r.op_answer_id === sup.op_answer_id)
    )

    const hasAnswer = linhas.length > 0
    const meta = linhas[0] ?? null // condições gerais (iguais em todas as linhas do mesmo answer)

    // Itens respondidos: uma linha por item, casando com os itens originais
    const answeredItems = items.map((item: any) => {
      const linha = linhas.find((r: any) =>
        String(r.cotacao_item_id) === String(item.id) ||
        (item.op_item_id != null && toInt(r.op_item_id) === toInt(item.op_item_id))
      ) ?? null

      const isAvailable       = linha?.available ?? false
      const unitPriceMicros   = linha != null ? Number(linha.unit_price_micros) : null
      const unitPrice         = (isAvailable && unitPriceMicros != null) ? unitPriceMicros / 1_000_000 : null
      const quantityAnswered  = linha?.quantity_answered != null ? Number(linha.quantity_answered) : Number(item.quantity)
      const totalPrice        = unitPrice != null ? unitPrice * quantityAnswered : null
      const discountVal       = linha?.discount != null ? Number(linha.discount) : 0
      const totalAfterDiscount = totalPrice != null ? totalPrice - discountVal : null

      return {
        cotacao_item_id:    item.id,
        op_item_id:         item.op_item_id ?? null,
        insumo_id:          item.insumo_id ?? null,
        name:               item.name,
        unit:               item.unit,
        quantity:           Number(item.quantity),
        answered:           linha?.answered  ?? false,
        available:          linha?.available ?? false,
        unit_price:         unitPrice,
        unit_price_micros:  unitPriceMicros,
        quantity_answered:  quantityAnswered,
        total_price:        totalAfterDiscount ?? totalPrice,
        discount:           discountVal,
        total_discount_micros: toInt(linha?.total_discount_micros),
      }
    })

    const subtotal = answeredItems.reduce((s: number, i: any) => s + (i.total_price ?? 0), 0)

    const freteLinha = linhas.find((r: any) => r.freight != null || r.free_shipping) ?? null
    const freight    = freteLinha?.free_shipping ? 0 : (freteLinha?.freight != null ? Number(freteLinha.freight) : null)
    const total      = freight != null ? subtotal + freight : subtotal

    return {
      supplier_id:       sup.id,
      supplier_name:     sup.supplier_name,
      supplier_city:     sup.supplier_city,
      supplier_email:    sup.supplier_email,
      supplier_phone:    sup.supplier_phone,
      is_recommended:    sup.is_recommended,
      mirror_company_id: sup.mirror_company_id,
      op_answer_id:      meta?.op_answer_id ?? sup.op_answer_id ?? null,
      answered:          hasAnswer,
      payment_method:    meta?.payment_method    ?? null,
      installments:      meta?.installments      ?? null,
      installments_obs:  meta?.installments_obs  ?? null,
      arrival_estimate:  meta?.arrival_estimate  ?? null,
      valid_until:       meta?.valid_until        ?? null,
      observations:      meta?.observations      ?? null,
      answered_at:       meta?.answered_at       ?? null,
      answered_items:    answeredItems,
      subtotal,
      freight,
      free_shipping:     freteLinha?.free_shipping ?? false,
      total,
    }
  })

  return NextResponse.json({
    cotacao_id:            id,
    identifier:            cotacao.identifier,
    obraplay_quotation_id: cotacao.obraplay_quotation_id,
    obra_name:             cotacao.obra_name,
    status:                cotacao.status,
    items: items.map((i: any) => ({
      id:         i.id,
      name:       i.name,
      unit:       i.unit,
      quantity:   Number(i.quantity),
      op_item_id: i.op_item_id ?? null,
      insumo_id:  i.insumo_id ?? null,
    })),
    suppliers: supplierMap,
  })
}

function toInt(v: any): number | null {
  return (v != null && !isNaN(parseInt(v))) ? parseInt(v) : null
}
