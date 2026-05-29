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

// Helpers de conversão segura de tipos
const toInt  = (v: any) => (v != null && !isNaN(parseInt(v))) ? parseInt(v) : null
const toStr  = (v: any) => (v != null) ? String(v) : null
const toBool = (v: any, fallback = false): boolean =>
  v === true || v === "true" || v === 1 ? true : v === false || v === "false" || v === 0 ? false : fallback
const toTs   = (v: any) => (v != null && v !== "") ? v : null

export async function POST(req: NextRequest) {
  // 1. Valida chave de integração
  if (!validateKey(req)) {
    console.log("[webhook] chave inválida")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // 2. Parse do payload
  let payload: any
  try {
    payload = await req.json()
  } catch (e) {
    console.error("[webhook] Payload JSON inválido:", e)
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // 3. Extrai opAnswerId e opQuotationId do envelope do ObraPlay
  // Formato: { hook: { event }, data: { model, pk, fields: { quotation, ... } } }
  let opAnswerId: number | undefined
  let opQuotationId: number | undefined
  let answer: any

  if (payload?.data?.pk && payload?.data?.fields) {
    opAnswerId    = Number(payload.data.pk)
    answer        = { id: opAnswerId, ...payload.data.fields }
    opQuotationId = Number(answer.quotation)
  } else {
    answer        = payload?.data ?? payload
    opAnswerId    = toInt(answer?.id) ?? undefined
    opQuotationId = toInt(answer?.quotation ?? answer?.quotation_id) ?? undefined
  }

  console.log("[webhook] event:", payload?.hook?.event, "| opAnswerId:", opAnswerId, "| opQuotationId:", opQuotationId)

  if (!opAnswerId || !opQuotationId) {
    console.log("[webhook] campos ausentes — payload completo:", JSON.stringify(payload))
    return NextResponse.json({ error: "Campos obrigatórios ausentes: id, quotation" }, { status: 422 })
  }

  // 4. Processamento principal
  try {
    // Busca a cotação local pelo obraplay_quotation_id
    console.log("[webhook] buscando cotacao com obraplay_quotation_id =", opQuotationId)
    const [cotacao] = await sql`
      SELECT id, status FROM cotacoes
      WHERE obraplay_quotation_id = ${opQuotationId}
      LIMIT 1
    `

    if (!cotacao) {
      console.log("[webhook] cotação ObraPlay", opQuotationId, "não encontrada localmente")
      return NextResponse.json({ ok: true, warning: "cotação não encontrada localmente" })
    }

    const cotacaoId: string = cotacao.id
    console.log("[webhook] cotacao encontrada:", cotacaoId, "| status atual:", cotacao.status)

    // Tenta casar o fornecedor pelo mirror_company_id = supplier_foreign_id
    let fornecedorId: string | null = null
    if (answer.supplier_foreign_id) {
      const mirrorId = toInt(answer.supplier_foreign_id)
      if (mirrorId) {
        const [forn] = await sql`
          SELECT id FROM cotacao_fornecedores
          WHERE cotacao_id = ${cotacaoId}
            AND mirror_company_id = ${mirrorId}
          LIMIT 1
        `
        fornecedorId = forn?.id ?? null
        console.log("[webhook] fornecedor mirror_company_id =", mirrorId, "| fornecedorId:", fornecedorId)
      }
    }

    // Upsert na tabela cotacao_respostas
    console.log("[webhook] upserting cotacao_respostas...")
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
        ${toStr(answer.supplier_foreign_id)},
        ${toStr(answer.payment_method)},
        ${toStr(answer.installments)},
        ${toStr(answer.installments_observations)},
        ${toTs(answer.arrival_estimate)},
        ${toTs(answer.valid_until)},
        ${toStr(answer.observations)},
        ${toTs(answer.answered_at)},
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
    console.log("[webhook] resposta upsertada:", respostaId)

    // Salva itens respondidos — DELETE + INSERT (sem unique constraint em (resposta_id, op_item_id))
    if (Array.isArray(answer.answered_items)) {
      console.log("[webhook] salvando", answer.answered_items.length, "itens...")
      await sql`DELETE FROM cotacao_resposta_itens WHERE resposta_id = ${respostaId}`
      for (const ai of answer.answered_items) {
        const [localItem] = await sql`
          SELECT id FROM cotacao_itens
          WHERE cotacao_id = ${cotacaoId} AND op_item_id = ${ai.id}
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
            ${toInt(ai.id)},
            ${toBool(ai.answered)},
            ${toBool(ai.available)},
            ${toInt(ai.unit_price_micros)},
            ${ai.quantity ?? null},
            ${toInt(ai.total_quantity_micros)},
            ${ai.discount ?? 0},
            ${toInt(ai.total_discount_micros)}
          )
        `
      }
      console.log("[webhook] itens salvos")
    }

    // Salva fretes — DELETE + INSERT
    if (Array.isArray(answer.answered_shipping_addresses)) {
      console.log("[webhook] salvando", answer.answered_shipping_addresses.length, "fretes...")
      await sql`DELETE FROM cotacao_resposta_fretes WHERE resposta_id = ${respostaId}`
      for (const addr of answer.answered_shipping_addresses) {
        await sql`
          INSERT INTO cotacao_resposta_fretes (
            resposta_id, op_address_id, freight,
            total_freight_micros, free_shipping, answered
          ) VALUES (
            ${respostaId},
            ${toInt(addr.id)},
            ${addr.freight ?? null},
            ${toInt(addr.total_freight_micros)},
            ${toBool(addr.free_shipping)},
            ${toBool(addr.answered)}
          )
        `
      }
      console.log("[webhook] fretes salvos")
    }

    // Atualiza status da cotação para "Respondida"
    if (cotacao.status !== "Respondida" && cotacao.status !== "Cancelada") {
      await sql`
        UPDATE cotacoes SET status = 'Respondida', updated_at = now()
        WHERE id = ${cotacaoId}
      `
      console.log("[webhook] cotacao atualizada para Respondida")
    }

    return NextResponse.json({ ok: true, resposta_id: respostaId })

  } catch (err: any) {
    console.error("[webhook] ERRO:", err?.message ?? err)
    console.error("[webhook] Stack:", err?.stack)
    return NextResponse.json({ error: "Erro interno", detail: err?.message }, { status: 500 })
  }
}
