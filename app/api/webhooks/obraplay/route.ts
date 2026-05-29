import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// Autenticação via query param: POST /api/webhooks/obraplay?key=<OBRAPLAY_INTEGRATION_KEY>
function validateKey(req: NextRequest): boolean {
  const expected = process.env.OBRAPLAY_INTEGRATION_KEY
  if (!expected) return true // sem configuração: aceita tudo (apenas dev)
  const provided = req.nextUrl.searchParams.get("key") ?? ""
  return provided === expected
}

export async function POST(req: NextRequest) {
  // Valida chave de integração via ?key=
  if (!validateKey(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // Formato envelope do ObraPlay:
  // { hook: { event }, data: { model, pk, fields: { quotation, supplier_foreign_id, ... } } }
  // O pk é o id do quotation_answer; os campos ficam em data.fields.
  let opAnswerId: number | undefined
  let opQuotationId: number | undefined
  let answer: any

  if (payload?.data?.pk && payload?.data?.fields) {
    // Formato envelope (formato real do ObraPlay)
    opAnswerId   = payload.data.pk
    answer       = { id: opAnswerId, ...payload.data.fields }
    opQuotationId = answer.quotation
  } else {
    // Formato direto (fallback / testes)
    answer        = payload?.data ?? payload
    opAnswerId    = answer?.id
    opQuotationId = answer?.quotation ?? answer?.quotation_id
  }

  console.log("[webhook] event:", payload?.hook?.event, "opAnswerId:", opAnswerId, "opQuotationId:", opQuotationId)

  if (!opAnswerId || !opQuotationId) {
    console.log("[webhook] payload recebido:", JSON.stringify(payload))
    return NextResponse.json({ error: "Campos obrigatórios ausentes: id, quotation" }, { status: 422 })
  }

  // Busca a cotação local pelo obraplay_quotation_id
  const [cotacao] = await sql`
    SELECT id, status FROM cotacoes
    WHERE obraplay_quotation_id = ${opQuotationId}
    LIMIT 1
  `
  if (!cotacao) {
    // Cotação não encontrada localmente — registra mas retorna 200 para não gerar retry
    console.log("[webhook] Cotação ObraPlay", opQuotationId, "não encontrada localmente")
    return NextResponse.json({ ok: true, warning: "cotação não encontrada localmente" })
  }

  const cotacaoId: string = cotacao.id

  // Tenta casar o fornecedor pelo supplier_foreign_id (mirror_company_id) ou pelo índice da resposta
  let fornecedorId: string | null = null
  if (answer.supplier_foreign_id) {
    const mirrorId = parseInt(answer.supplier_foreign_id)
    if (!isNaN(mirrorId)) {
      const [forn] = await sql`
        SELECT id FROM cotacao_fornecedores
        WHERE cotacao_id = ${cotacaoId}
          AND mirror_company_id = ${mirrorId}
        LIMIT 1
      `
      fornecedorId = forn?.id ?? null
    }
  }

  // Upsert na tabela cotacao_respostas
  const [resposta] = await sql`
    INSERT INTO cotacao_respostas (
      cotacao_id, cotacao_fornecedor_id, op_answer_id,
      supplier_foreign_id, payment_method, installments,
      installments_obs, arrival_estimate, valid_until,
      observations, answered_at, raw_payload
    ) VALUES (
      ${cotacaoId},
      ${fornecedorId},
      ${opAnswerId},
      ${answer.supplier_foreign_id ?? null},
      ${answer.payment_method ?? null},
      ${answer.installments ?? null},
      ${answer.installments_observations ?? null},
      ${answer.arrival_estimate ?? null},
      ${answer.valid_until ?? null},
      ${answer.observations ?? null},
      ${answer.answered_at ?? null},
      ${JSON.stringify(payload)}
    )
    ON CONFLICT (cotacao_id, op_answer_id) DO UPDATE SET
      payment_method   = EXCLUDED.payment_method,
      installments     = EXCLUDED.installments,
      installments_obs = EXCLUDED.installments_obs,
      arrival_estimate = EXCLUDED.arrival_estimate,
      valid_until      = EXCLUDED.valid_until,
      observations     = EXCLUDED.observations,
      answered_at      = EXCLUDED.answered_at,
      raw_payload      = EXCLUDED.raw_payload,
      updated_at       = now()
    RETURNING id
  `

  const respostaId: string = resposta.id

  // Salva itens respondidos
  if (Array.isArray(answer.answered_items)) {
    for (const ai of answer.answered_items) {
      // Tenta casar o item da cotação pelo op_item_id que foi enviado ao criar (cotacao_itens.op_item_id)
      const [localItem] = await sql`
        SELECT id FROM cotacao_itens
        WHERE cotacao_id = ${cotacaoId}
          AND op_item_id = ${ai.id}
        LIMIT 1
      `

      await sql`
        INSERT INTO cotacao_resposta_itens (
          resposta_id, cotacao_item_id, op_item_id,
          answered, available, unit_price_micros,
          quantity, total_quantity_micros,
          discount, total_discount_micros
        ) VALUES (
          ${respostaId},
          ${localItem?.id ?? null},
          ${ai.id},
          ${ai.answered ?? false},
          ${ai.available ?? false},
          ${ai.unit_price_micros ?? null},
          ${ai.quantity ?? null},
          ${ai.total_quantity_micros ?? null},
          ${ai.discount ?? 0},
          ${ai.total_discount_micros ?? null}
        )
        ON CONFLICT DO NOTHING
      `
    }
  }

  // Salva fretes
  if (Array.isArray(answer.answered_shipping_addresses)) {
    for (const addr of answer.answered_shipping_addresses) {
      await sql`
        INSERT INTO cotacao_resposta_fretes (
          resposta_id, op_address_id, freight,
          total_freight_micros, free_shipping, answered
        ) VALUES (
          ${respostaId},
          ${addr.id},
          ${addr.freight ?? null},
          ${addr.total_freight_micros ?? null},
          ${addr.free_shipping ?? false},
          ${addr.answered ?? false}
        )
        ON CONFLICT DO NOTHING
      `
    }
  }

  // Atualiza status da cotação para "Respondida" automaticamente
  if (cotacao.status !== "Respondida" && cotacao.status !== "Cancelada") {
    await sql`
      UPDATE cotacoes
      SET status = 'Respondida', updated_at = now()
      WHERE id = ${cotacaoId}
    `
  }

  return NextResponse.json({ ok: true, resposta_id: respostaId })
}
