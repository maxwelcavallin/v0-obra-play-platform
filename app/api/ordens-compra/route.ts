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

  // Marca a cotação como "Ordem de compra gerada" assim que a primeira OC for criada
  await sql`
    UPDATE cotacoes
    SET status = 'Ordem de compra gerada', updated_at = now()
    WHERE id = ${cotacao_id}
      AND status NOT IN ('Cancelada', 'Rascunho', 'Ordem de compra gerada')
  `

  // ─── Integração ObraPlay: cria a OC via /api/orders/nested/ ───────────────────
  let opError: string | null = null

  if (obraplay_answer_id) {
    // Filtra apenas itens que têm o pk da resposta do ObraPlay
    const nestedItems = (Array.isArray(items) ? items : [])
      .filter((it: any) => it?.op_answered_item_id != null)

    if (nestedItems.length === 0) {
      opError = "Itens sem ID de resposta do ObraPlay (op_answered_item_id). " +
                "A cotação pode ter sido respondida antes da atualização da integração — peça uma nova resposta ao fornecedor."
    } else if (obraplay_address_id == null) {
      opError = "Endereço de entrega sem ID de resposta do ObraPlay (op_answered_address_id)."
    } else {
      // Busca dados da cotação + empresa compradora para montar o payload completo
      const [cotCtx] = await sql`
        SELECT
          c.requester_name, c.requester_email, c.requester_phone,
          comp.obraplay_company_id,
          comp.cnpj           AS company_cnpj,
          comp.fantasy_name   AS company_name,
          comp.email          AS company_email,
          comp.street, comp.number, comp.neighbourhood,
          comp.city, comp.state, comp.zipcode
        FROM cotacoes c
        JOIN companies comp ON comp.id = c.company_id
        WHERE c.id = ${cotacao_id}
      `

      if (!cotCtx?.obraplay_company_id) {
        opError = "Empresa compradora sem obraplay_company_id — vincule a empresa ao ObraPlay antes de emitir a OC."
      } else {
        // Busca dados do fornecedor via cotacao_respostas
        const [supCtx] = await sql`
          SELECT mirror_company_id, supplier_name, supplier_email, supplier_phone
          FROM cotacao_respostas
          WHERE op_answer_id = ${Number(obraplay_answer_id)}
          LIMIT 1
        `

        const payload: OPOrderNestedPayload = {
          quotation_answer:   Number(obraplay_answer_id),
          foreign_id:         identifier,
          // Empresa compradora
          company:            cotCtx.obraplay_company_id,
          name:               cotCtx.requester_name  ?? cotCtx.company_name ?? supplier_name,
          email:              cotCtx.requester_email ?? null,
          phone:              cotCtx.requester_phone ?? null,
          // Fornecedor
          supplier_company:   supCtx?.mirror_company_id ?? null,
          supplier_name:      supplier_name,
          supplier_email:     supplier_email ?? supCtx?.supplier_email ?? null,
          supplier_phone:     supplier_phone ?? supCtx?.supplier_phone ?? null,
          // Condições comerciais
          payment_method:     payment_method ?? null,
          arrival_estimate:   arrival_estimate ?? null,
          // Dados de faturamento (billing_data)
          billing_data: {
            cnpj:         cotCtx.company_cnpj  ?? null,
            company_name: cotCtx.company_name  ?? null,
            email:        cotCtx.company_email ?? cotCtx.requester_email ?? null,
            street:       cotCtx.street        ?? null,
            number:       cotCtx.number        ?? null,
            neighbourhood: cotCtx.neighbourhood ?? null,
            city:         cotCtx.city          ?? null,
            state:        cotCtx.state         ?? null,
            zipcode:      cotCtx.zipcode       ?? null,
          },
          shipping_addresses: [
            {
              quotation_answered_shipping_address: Number(obraplay_address_id),
              items: nestedItems.map((it: any) => ({
                quotation_answered_item: Number(it.op_answered_item_id),
                name:                   it.name,
                measurement_unit:       it.unit ?? it.measurement_unit ?? null,
                type:                   "custom",
                ...(it.unit_price_micros    != null ? { unit_price_micros:     Number(it.unit_price_micros) }    : {}),
                ...(it.total_quantity_micros != null ? { total_quantity_micros: Number(it.total_quantity_micros) } : {}),
                ...(it.total_discount_micros != null ? { total_discount_micros: Number(it.total_discount_micros) } : {}),
              })),
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
