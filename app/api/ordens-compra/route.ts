import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { obraplay, type OPOrderNestedPayload } from "@/lib/obraplay-client"

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
    items, subtotal, freight, total, payment_method, arrival_estimate,
    obraplay_answer_id, obraplay_address_id } = b

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

  // ─── Integração ObraPlay: cria a OC via /api/orders/nested/ ───────────────────
  // Deriva de uma answer (obraplay_answer_id) e envia SOMENTE os itens selecionados.
  // Cada item precisa do pk da resposta (op_answered_item_id) e o endereço do pk de frete.
  let opError: string | null = null

  if (obraplay_answer_id) {
    // Monta os itens nested apenas com os que têm o ID da resposta do ObraPlay
    const nestedItems = (Array.isArray(items) ? items : [])
      .filter((it: any) => it?.op_answered_item_id != null)
      .map((it: any) => ({
        quotation_answered_item: Number(it.op_answered_item_id),
        ...(it.unit_price_micros    != null ? { unit_price_micros:     Number(it.unit_price_micros) }    : {}),
        ...(it.total_quantity_micros != null ? { total_quantity_micros: Number(it.total_quantity_micros) } : {}),
        ...(it.total_discount_micros != null ? { total_discount_micros: Number(it.total_discount_micros) } : {}),
      }))

    if (nestedItems.length === 0) {
      opError = "Itens sem ID de resposta do ObraPlay (op_answered_item_id). " +
                "A cotação pode ter sido respondida antes da atualização da integração — peça uma nova resposta ao fornecedor."
    } else if (obraplay_address_id == null) {
      opError = "Endereço de entrega sem ID de resposta do ObraPlay (op_answered_address_id)."
    } else {
      const payload: OPOrderNestedPayload = {
        quotation_answer: Number(obraplay_answer_id),
        foreign_id:       identifier,
        shipping_addresses: [
          {
            quotation_answered_shipping_address: Number(obraplay_address_id),
            items: nestedItems,
          },
        ],
      }
      try {
        const created = await obraplay.orders.createNested(payload)
        await sql`
          UPDATE ordens_compra
          SET obraplay_order_id   = ${created?.id ?? null},
              obraplay_order_code = ${created?.code ?? created?.foreign_id ?? null},
              obraplay_sync_error = NULL,
              status              = 'Enviada ao fornecedor',
              updated_at          = now()
          WHERE id = ${oc.id}
        `
        oc.obraplay_order_id   = created?.id ?? null
        oc.obraplay_order_code = created?.code ?? created?.foreign_id ?? null
        oc.status              = 'Enviada ao fornecedor'
      } catch (err: any) {
        opError = `Falha ao criar OC no ObraPlay: ${err?.message ?? String(err)}`
        console.error("[ordens-compra] ObraPlay erro:", opError)
      }
    }
  } else {
    opError = "OC criada apenas localmente (sem obraplay_answer_id vinculado)."
  }

  // Persiste o erro de sync (se houver) sem bloquear a resposta
  if (opError) {
    await sql`UPDATE ordens_compra SET obraplay_sync_error = ${opError}, updated_at = now() WHERE id = ${oc.id}`
    oc.obraplay_sync_error = opError
  }

  return NextResponse.json(opError ? { ...oc, _op_error: opError } : oc, { status: 201 })
}
