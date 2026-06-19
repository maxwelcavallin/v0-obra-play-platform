import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { obraplay, type OPOrderNestedPayload } from "@/lib/obraplay-client"

export const dynamic = "force-dynamic"

/** Remove campos com valor null ou "" de um objeto — o ObraPlay rejeita null como "em branco" */
function omitNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== "")
  ) as Partial<T>
}

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
    items, subtotal, freight, total, payment_method, arrival_estimate,
    obraplay_answer_id, obraplay_address_id } = b

  if (!company_id || !cotacao_id || !supplier_name) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
  }

  // Guard de cobertura: verifica quais cotacao_item_ids já estão cobertos por OC ativa
  // - Se TODOS os itens enviados já estão cobertos → 409
  // - Se ALGUM item já está coberto → 409 parcial (impede duplicar item específico)
  if (cotacao_id && Array.isArray(items) && items.length > 0) {
    const ocAtivas = await sql`
      SELECT identifier, items FROM ordens_compra
      WHERE cotacao_id = ${cotacao_id}
        AND status != 'Cancelada'
    `
    const coveredIds = new Set<string>()
    for (const oc of ocAtivas) {
      const ocItems: any[] = Array.isArray(oc.items) ? oc.items : []
      for (const it of ocItems) {
        if (it.cotacao_item_id) coveredIds.add(String(it.cotacao_item_id))
      }
    }

    if (coveredIds.size > 0) {
      const incomingIds = items
        .map((it: any) => String(it.cotacao_item_id))
        .filter(Boolean)

      const alreadyCovered = incomingIds.filter(id => coveredIds.has(id))

      if (alreadyCovered.length > 0) {
        const allCovered = alreadyCovered.length === incomingIds.length
        return NextResponse.json({
          error: allCovered
            ? "Todos os itens desta cotação já possuem ordem de compra ativa."
            : "Um ou mais itens selecionados já possuem ordem de compra ativa.",
          detail: allCovered
            ? "Não é possível gerar uma nova OC pois todos os itens já estão cobertos. Cancele a OC existente para gerar uma nova."
            : `Os itens já cobertos não podem ser incluídos novamente. Selecione apenas os itens restantes (sem OC ativa).`,
          support: "Acesse a lista de Ordens de Compra para gerenciar as existentes.",
        }, { status: 409 })
      }
    }
  }

  // Gera identificador OC-XXXXXX
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  const identifier = `OC-${rand}`

  // ─── Integração ObraPlay PRIMEIRO — não salva se a integração com ObraPlay falhar ──
  // Só pulamos a integração quando não há obraplay_answer_id (OC manual sem cotação vinculada).
  let opOrderId: number | null = null
  let opOrderCode: string | null = null

  if (obraplay_answer_id) {
    const nestedItems = (Array.isArray(items) ? items : [])
      .filter((it: any) => it?.op_answered_item_id != null)

    if (nestedItems.length === 0) {
      return NextResponse.json({
        error: "Não foi possível enviar a ordem de compra ao ObraPlay.",
        detail: "Os itens desta cotação não possuem ID de resposta do ObraPlay (op_answered_item_id). Isso acontece quando a cotação foi respondida pelo fornecedor antes de uma atualização da integração.",
        support: "Entre em contato com o suporte informando o código da cotação para que possamos corrigir manualmente.",
      }, { status: 400 })
    }

    if (obraplay_address_id == null) {
      return NextResponse.json({
        error: "Não foi possível enviar a ordem de compra ao ObraPlay.",
        detail: "O endereço de entrega não possui ID de resposta do ObraPlay (op_answered_address_id).",
        support: "Entre em contato com o suporte informando o código da cotação para que possamos corrigir manualmente.",
      }, { status: 400 })
    }

    // Busca dados da cotação + empresa + obra para montar endereços
    const [cotCtx] = await sql`
      SELECT
        c.requester_name, c.requester_email, c.requester_phone,
        c.address_type,
        comp.obraplay_company_id,
        comp.cnpj           AS company_cnpj,
        comp.fantasy_name   AS company_name,
        comp.email          AS company_email,
        comp.street         AS company_street,
        comp.number         AS company_number,
        comp.neighbourhood  AS company_neighbourhood,
        comp.city           AS company_city,
        comp.state          AS company_state,
        comp.zipcode        AS company_zipcode,
        o.delivery_street, o.delivery_number, o.delivery_complement,
        o.delivery_neighbourhood, o.delivery_city, o.delivery_state, o.delivery_zipcode,
        o.billing_street, o.billing_number, o.billing_complement,
        o.billing_neighbourhood, o.billing_city, o.billing_state, o.billing_zipcode,
        o.same_billing_address
      FROM cotacoes c
      JOIN companies comp ON comp.id = c.company_id
      LEFT JOIN obras o ON o.id = c.obra_id
      WHERE c.id = ${cotacao_id}
    `

    if (!cotCtx?.obraplay_company_id) {
      return NextResponse.json({
        error: "Não foi possível enviar a ordem de compra ao ObraPlay.",
        detail: "A empresa não está vinculada ao ObraPlay (obraplay_company_id ausente).",
        support: "Entre em contato com o suporte para vincular sua empresa ao ObraPlay antes de emitir ordens de compra.",
      }, { status: 400 })
    }

    const [supCtx] = await sql`
      SELECT mirror_company_id, supplier_name, supplier_email, supplier_phone
      FROM cotacao_respostas
      WHERE op_answer_id = ${Number(obraplay_answer_id)}
      LIMIT 1
    `

    const payload: OPOrderNestedPayload = {
      quotation_answer:  Number(obraplay_answer_id),
      foreign_id:        identifier,
      company:           cotCtx.obraplay_company_id,
      name:              cotCtx.requester_name  ?? cotCtx.company_name ?? supplier_name,
      email:             cotCtx.requester_email ?? null,
      phone:             cotCtx.requester_phone ?? null,
      supplier_company:  supCtx?.mirror_company_id ?? null,
      supplier_name:     supplier_name,
      supplier_email:    supplier_email ?? supCtx?.supplier_email ?? null,
      supplier_phone:    supplier_phone ?? supCtx?.supplier_phone ?? null,
      payment_method:    payment_method ?? null,
      arrival_estimate:  arrival_estimate ?? null,
      billing_data: omitNulls({
        cnpj:          cotCtx.company_cnpj                             ?? null,
        company_name:  cotCtx.company_name                             ?? null,
        name:          cotCtx.requester_name ?? cotCtx.company_name    ?? null,
        email:         cotCtx.company_email  ?? cotCtx.requester_email ?? null,
        street:        cotCtx.company_street                           ?? null,
        number:        cotCtx.company_number                           ?? null,
        neighbourhood: cotCtx.company_neighbourhood                    ?? null,
        city:          cotCtx.company_city                             ?? null,
        state:         cotCtx.company_state                            ?? null,
        zipcode:       cotCtx.company_zipcode                          ?? null,
      }),
      shipping_addresses: [{
        quotation_answered_shipping_address: Number(obraplay_address_id),
        // has_store_pickup: true bypassa a validação de endereço obrigatório.
        // O endereço de entrega já está vinculado ao quotation_answered_shipping_address
        // no ObraPlay — campos soltos seriam redundantes e o ObraPlay valida o endereço
        // da resposta (que pode estar vazio no lado deles), causando o erro 400.
        has_store_pickup: true,
        items: nestedItems.map((it: any) => ({
          quotation_answered_item: Number(it.op_answered_item_id),
          name:                   it.name,
          measurement_unit:       it.unit ?? it.measurement_unit ?? null,
          type:                   "I",
          ...(it.unit_price_micros    != null ? { unit_price_micros:     Number(it.unit_price_micros) }    : {}),
          ...(it.total_quantity_micros != null ? { total_quantity_micros: Number(it.total_quantity_micros) } : {}),
          ...(it.total_discount_micros != null ? { total_discount_micros: Number(it.total_discount_micros) } : {}),
        })),
      }],
    }

    try {
      const created = await obraplay.orders.createNested(payload)
      opOrderId   = created?.id   ?? null
      opOrderCode = created?.code ?? created?.foreign_id ?? null
    } catch (err: any) {
      const detail = err?.message ?? String(err)
      console.error("[ordens-compra] ObraPlay erro:", detail)
      return NextResponse.json({
        error: "Não foi possível enviar a ordem de compra ao ObraPlay.",
        detail,
        support: "Entre em contato com o suporte informando o erro acima e o código da cotação.",
      }, { status: 400 })
    }
  }

  // ─── Só chega aqui se a integração ObraPlay foi bem-sucedida (ou se não há answer_id) ───
  const [oc] = await sql`
    INSERT INTO ordens_compra
      (company_id, cotacao_id, identifier, supplier_name, supplier_cnpj, supplier_email,
       supplier_phone, items, subtotal, freight, total, payment_method, arrival_estimate,
       obraplay_answer_id, obraplay_order_id, obraplay_order_code, status)
    VALUES
      (${company_id}, ${cotacao_id}, ${identifier}, ${supplier_name}, ${supplier_cnpj ?? null},
       ${supplier_email ?? null}, ${supplier_phone ?? null}, ${JSON.stringify(items ?? [])},
       ${subtotal ?? 0}, ${freight ?? 0}, ${total ?? 0}, ${payment_method ?? null},
       ${arrival_estimate ?? null}, ${obraplay_answer_id ?? null},
       ${opOrderId}, ${opOrderCode},
       ${obraplay_answer_id ? 'Enviada ao fornecedor' : 'Aguardando fornecedor'})
    RETURNING *
  `

  // Marca a cotação como "Ordem de compra gerada"
  await sql`
    UPDATE cotacoes
    SET status = 'Ordem de compra gerada', updated_at = now()
    WHERE id = ${cotacao_id}
      AND status NOT IN ('Cancelada', 'Rascunho', 'Ordem de compra gerada')
  `

  return NextResponse.json(oc, { status: 201 })
}
