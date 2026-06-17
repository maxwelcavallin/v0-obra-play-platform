import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// Autenticação via query param: POST /api/webhooks/obraplay?key=<OBRAPLAY_INTEGRATION_KEY>
function validateKey(req: NextRequest): boolean {
  const expected = process.env.OBRAPLAY_INTEGRATION_KEY
  if (!expected) return true
  const provided = req.nextUrl.searchParams.get("key") ?? ""
  return provided === expected
}

const toInt  = (v: any): number | null => (v != null && !isNaN(parseInt(v))) ? parseInt(v) : null
const toStr  = (v: any): string | null => (v != null) ? String(v) : null
const toBool = (v: any, fallback = false): boolean =>
  v === true || v === "true" || v === 1 ? true : v === false || v === "false" || v === 0 ? false : fallback
const toTs   = (v: any): string | null => (v != null && v !== "") ? String(v) : null
const toDec  = (v: any): string | null => (v != null && !isNaN(parseFloat(v))) ? String(v) : null

export async function POST(req: NextRequest) {
  if (!validateKey(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
  }

  // Extrai do envelope ObraPlay: { hook, data: { model, pk, fields } }
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
    console.log("[webhook] campos ausentes — payload:", JSON.stringify(payload))
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 422 })
  }

  try {
    // 1. Busca cotação local pelo obraplay_quotation_id
    const [cotacao] = await sql`
      SELECT id, status, identifier, need_date, expiry_date,
             general_notes, address_type, is_public,
             requester_name, requester_email, requester_phone
      FROM cotacoes
      WHERE obraplay_quotation_id = ${opQuotationId}
      LIMIT 1
    `
    if (!cotacao) {
      console.log("[webhook] cotação ObraPlay", opQuotationId, "não encontrada localmente")
      return NextResponse.json({ ok: true, warning: "cotação não encontrada localmente" })
    }
    const cotacaoId: string = cotacao.id
    console.log("[webhook] cotacao:", cotacaoId, "| status:", cotacao.status)

    // 2. Busca fornecedor local pelo mirror_company_id = supplier_foreign_id
    let fornecedor: any = null
    if (answer.supplier_foreign_id) {
      const mirrorId = toInt(answer.supplier_foreign_id)
      if (mirrorId) {
        const [f] = await sql`
          SELECT id, supplier_name, supplier_city, supplier_email,
                 supplier_phone, mirror_company_id
          FROM cotacao_fornecedores
          WHERE cotacao_id = ${cotacaoId} AND mirror_company_id = ${mirrorId}
          LIMIT 1
        `
        fornecedor = f ?? null
      }
    }
    console.log("[webhook] fornecedor:", fornecedor?.id ?? "não casado")

    // 3. Busca todos os itens originais da cotação
    const itens = await sql`
      SELECT id, insumo_id, name, unit, quantity, op_item_id
      FROM cotacao_itens
      WHERE cotacao_id = ${cotacaoId}
      ORDER BY created_at
    `

    // 4. Processa itens respondidos
    // O ObraPlay envia arrays de envelopes: [{ pk, model, fields: { item, answered, available, unit_price_micros, ... } }]
    // Desempacota para obter os fields diretos
    // Preserva o `pk` de cada envelope { pk, model, fields } em `_op_answered_id`.
    // Esse pk é o `quotation_answered_item` / `quotation_answered_shipping_address`
    // exigido pelo endpoint /api/orders/nested/ do ObraPlay ao gerar a Ordem de Compra.
    const rawItems: any[] = answer.answered_items ?? answer.items ?? []
    const answeredItems = rawItems.map((ai: any) =>
      ai?.fields ? { ...ai.fields, _op_answered_id: toInt(ai.pk) } : ai  // desempacota envelope { pk, model, fields }
    )

    const rawFretes: any[] = answer.answered_shipping_addresses ?? answer.shipping_addresses ?? []
    const answeredFretes = rawFretes.map((f: any) =>
      f?.fields ? { ...f.fields, _op_answered_id: toInt(f.pk) } : f
    )

    console.log("[webhook] itens respondidos:", answeredItems.length, "| itens locais:", itens.length)
    if (answeredItems.length > 0) {
      console.log("[webhook] primeiro item (desempacotado):", JSON.stringify(answeredItems[0]))
    }

    const freteUnico = answeredFretes[0] ?? null

    // 5. DELETE + INSERT das linhas desnormalizadas para este op_answer_id
    await sql`DELETE FROM cotacao_respostas WHERE cotacao_id = ${cotacaoId} AND op_answer_id = ${opAnswerId}`

    // Recusa = fornecedor respondeu mas TODOS os itens vieram com available=false
    const isRefused = answeredItems.length > 0 && answeredItems.every((ai: any) => !toBool(ai.available))

    if (answeredItems.length > 0) {
      // Uma linha por item respondido
      for (let idx = 0; idx < answeredItems.length; idx++) {
        const ai = answeredItems[idx]
        // Casa item pelo op_item_id salvo no banco, ou por posição (índice) como fallback
        const opItemId = toInt(ai.item ?? ai.id ?? null)
        const localItem = (
          opItemId ? itens.find((i: any) => i.op_item_id === opItemId) : null
        ) ?? itens[idx] ?? null

        // Persiste op_item_id no item local para futuros casamentos por ID
        if (localItem && opItemId && !localItem.op_item_id) {
          await sql`UPDATE cotacao_itens SET op_item_id = ${opItemId} WHERE id = ${localItem.id}`
          localItem.op_item_id = opItemId
        }

        // Frete: casa pelo campo shipping_address do frete correspondente ou usa o único disponível
        const frete = answeredFretes.find((f: any) =>
          toInt(f.shipping_address ?? f.id) === toInt(ai.shipping_address ?? null)
        ) ?? freteUnico

        await sql`
          INSERT INTO cotacao_respostas (
            cotacao_id,           cotacao_fornecedor_id,  cotacao_item_id,
            op_answer_id,         op_item_id,
            cotacao_identifier,   cotacao_need_date,      cotacao_expiry_date,
            cotacao_general_notes, cotacao_address_type,  cotacao_is_public,
            cotacao_requester_name, cotacao_requester_email, cotacao_requester_phone,
            item_name,            item_unit,              item_quantity,          item_insumo_id,
            supplier_name,        supplier_city,          supplier_email,
            supplier_phone,       supplier_foreign_id,    mirror_company_id,
            payment_method,       installments,           installments_obs,
            arrival_estimate,     valid_until,            observations,           answered_at,
            answered,             available,
            unit_price_micros,    quantity_answered,      total_quantity_micros,
            discount,             total_discount_micros,
            freight,              total_freight_micros,   free_shipping,          freight_answered,
            op_address_id,        op_answered_item_id,    op_answered_address_id,
            is_refused,           raw_payload
          ) VALUES (
            ${cotacaoId},
            ${fornecedor?.id ?? null},
            ${localItem?.id ?? null},
            ${opAnswerId},
            ${opItemId},
            ${cotacao.identifier},
            ${cotacao.need_date ?? null},
            ${cotacao.expiry_date ?? null},
            ${cotacao.general_notes ?? null},
            ${cotacao.address_type ?? null},
            ${cotacao.is_public ?? false},
            ${cotacao.requester_name ?? null},
            ${cotacao.requester_email ?? null},
            ${cotacao.requester_phone ?? null},
            ${localItem?.name ?? toStr(ai.name ?? ai.item_name) ?? 'Item sem nome'},
            ${localItem?.unit ?? toStr(ai.unit) ?? ''},
            ${toDec(localItem?.quantity ?? ai.quantity) ?? '0'},
            ${localItem?.insumo_id ?? null},
            ${fornecedor?.supplier_name ?? toStr(answer.supplier_name) ?? null},
            ${fornecedor?.supplier_city ?? null},
            ${fornecedor?.supplier_email ?? null},
            ${fornecedor?.supplier_phone ?? null},
            ${toStr(answer.supplier_foreign_id)},
            ${toInt(answer.supplier_foreign_id)},
            ${toStr(answer.payment_method)},
            ${toStr(answer.installments)},
            ${toStr(answer.installments_observations ?? answer.installments_obs)},
            ${toTs(answer.arrival_estimate)},
            ${toTs(answer.valid_until)},
            ${toStr(answer.observations)},
            ${toTs(answer.answered_at)},
            ${toBool(ai.answered)},
            ${toBool(ai.available)},
            ${toInt(ai.unit_price_micros)},
            ${toDec(ai.quantity)},
            ${toInt(ai.total_quantity_micros)},
            ${toDec(ai.discount) ?? '0'},
            ${toInt(ai.total_discount_micros)},
            ${toDec(frete?.freight)},
            ${toInt(frete?.total_freight_micros)},
            ${toBool(frete?.free_shipping)},
            ${toBool(frete?.answered)},
            ${toInt(frete?.shipping_address ?? frete?.id)},
            ${ai._op_answered_id ?? null},
            ${frete?._op_answered_id ?? null},
            ${isRefused},
            ${JSON.stringify(payload)}
          )
        `
      }
    } else {
      // Sem itens respondidos — insere uma linha por item original com preços nulos
      for (const localItem of itens) {
        await sql`
          INSERT INTO cotacao_respostas (
            cotacao_id,           cotacao_fornecedor_id,  cotacao_item_id,
            op_answer_id,         op_item_id,
            cotacao_identifier,   cotacao_need_date,      cotacao_expiry_date,
            cotacao_general_notes, cotacao_address_type,  cotacao_is_public,
            cotacao_requester_name, cotacao_requester_email, cotacao_requester_phone,
            item_name,            item_unit,              item_quantity,          item_insumo_id,
            supplier_name,        supplier_city,          supplier_email,
            supplier_phone,       supplier_foreign_id,    mirror_company_id,
            payment_method,       installments,           installments_obs,
            arrival_estimate,     valid_until,            observations,           answered_at,
            answered,             available,
            freight,              total_freight_micros,   free_shipping,          freight_answered,
            op_address_id,        is_refused,             raw_payload
          ) VALUES (
            ${cotacaoId},
            ${fornecedor?.id ?? null},
            ${localItem.id},
            ${opAnswerId},
            ${localItem.op_item_id ?? null},
            ${cotacao.identifier},
            ${cotacao.need_date ?? null},
            ${cotacao.expiry_date ?? null},
            ${cotacao.general_notes ?? null},
            ${cotacao.address_type ?? null},
            ${cotacao.is_public ?? false},
            ${cotacao.requester_name ?? null},
            ${cotacao.requester_email ?? null},
            ${cotacao.requester_phone ?? null},
            ${localItem.name},
            ${localItem.unit},
            ${String(localItem.quantity)},
            ${localItem.insumo_id ?? null},
            ${fornecedor?.supplier_name ?? null},
            ${fornecedor?.supplier_city ?? null},
            ${fornecedor?.supplier_email ?? null},
            ${fornecedor?.supplier_phone ?? null},
            ${toStr(answer.supplier_foreign_id)},
            ${toInt(answer.supplier_foreign_id)},
            ${toStr(answer.payment_method)},
            ${toStr(answer.installments)},
            ${toStr(answer.installments_observations ?? answer.installments_obs)},
            ${toTs(answer.arrival_estimate)},
            ${toTs(answer.valid_until)},
            ${toStr(answer.observations)},
            ${toTs(answer.answered_at)},
            false,
            false,
            ${toDec(freteUnico?.freight)},
            ${toInt(freteUnico?.total_freight_micros)},
            ${toBool(freteUnico?.free_shipping)},
            ${toBool(freteUnico?.answered)},
            ${toInt(freteUnico?.shipping_address ?? freteUnico?.id)},
            false,
            ${JSON.stringify(payload)}
          )
        `
      }
    }

    console.log("[webhook] respostas inseridas com sucesso")

    // 6. Atualiza status:
    //    "Respondida"               = TODOS os fornecedores ObraPlay responderam
    //    "Parcialmente respondida"  = ao menos UM respondeu, mas não todos
    if (cotacao.status !== "Cancelada") {
      const [{ total_op, total_resp }] = await sql`
        SELECT
          -- total de fornecedores vinculados ao ObraPlay (têm mirror_company_id ou op_answer_id)
          COUNT(*)::int                                                        AS total_op,
          -- total de fornecedores que já têm ao menos uma linha em cotacao_respostas (inclui recusados)
          COUNT(DISTINCT cr.cotacao_fornecedor_id)::int                        AS total_resp
        FROM cotacao_fornecedores cf
        LEFT JOIN cotacao_respostas cr ON cr.cotacao_fornecedor_id = cf.id
        WHERE cf.cotacao_id = ${cotacaoId}
          AND cf.mirror_company_id IS NOT NULL
      `
      const novoStatus = total_resp >= total_op ? "Respondida" : "Parcialmente respondida"
      await sql`UPDATE cotacoes SET status = ${novoStatus}, updated_at = now() WHERE id = ${cotacaoId}`
      console.log("[webhook] cotacao atualizada para", novoStatus, `(${total_resp}/${total_op} fornecedores ObraPlay)`)
    }

    return NextResponse.json({ ok: true, op_answer_id: opAnswerId, itens_inseridos: answeredItems.length || itens.length })

  } catch (err: any) {
    console.error("[webhook] ERRO:", err?.message ?? err)
    console.error("[webhook] Stack:", err?.stack)
    return NextResponse.json({ error: "Erro interno", detail: err?.message }, { status: 500 })
  }
}
