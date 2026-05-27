import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { obraplay } from "@/lib/obraplay-client"
import type { OPQuotationAnswer, OPQuotationItem } from "@/lib/obraplay-client"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params

  const [row] = await sql`
    SELECT c.*, o.name AS obra_name, o.delivery_street, o.delivery_number,
      o.delivery_neighbourhood, o.delivery_city, o.delivery_state, o.delivery_zipcode,
      o.billing_street, o.billing_number, o.billing_neighbourhood, o.billing_city, o.billing_state,
      u.name AS created_by_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.id = ${id}
  `
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const items = await sql`SELECT * FROM cotacao_itens WHERE cotacao_id = ${id} ORDER BY created_at`
  const suppliers = await sql`SELECT * FROM cotacao_fornecedores WHERE cotacao_id = ${id} ORDER BY is_recommended DESC, created_at`

  return NextResponse.json({ ...row, items, suppliers })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const b = await req.json()

  const [updated] = await sql`
    UPDATE cotacoes SET
      status = COALESCE(${b.status ?? null}, status),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  return NextResponse.json(updated)
}

// ── DELETE: exclui rascunho fisicamente ou cancela cotação enviada ───────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const cancelReason: string = body.cancel_reason || "Cancelado pelo usuário"

  const [cotacao] = await sql`SELECT status, obraplay_quotation_id FROM cotacoes WHERE id = ${id}`
  if (!cotacao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Rascunho: exclui fisicamente sem acionar ObraPlay
  if (cotacao.status === "Rascunho") {
    await sql`DELETE FROM cotacao_itens WHERE cotacao_id = ${id}`
    await sql`DELETE FROM cotacao_fornecedores WHERE cotacao_id = ${id}`
    await sql`DELETE FROM cotacoes WHERE id = ${id}`
    return NextResponse.json({ deleted: true })
  }

  // Cotação enviada: cancela localmente + no ObraPlay
  let opWarning: string | undefined
  if (cotacao.obraplay_quotation_id) {
    try {
      await obraplay.quotations.cancel(cotacao.obraplay_quotation_id, cancelReason)
    } catch (err: any) {
      opWarning = "Cancelado localmente. Falha ao cancelar no ObraPlay: " + (err?.message ?? "erro")
    }
  }

  const [updated] = await sql`
    UPDATE cotacoes SET status = 'Cancelada', updated_at = now() WHERE id = ${id} RETURNING *
  `
  return NextResponse.json({ ...updated, _op_warning: opWarning })
}

// ── PATCH: edita localmente + cancela cotação anterior no ObraPlay e reenvia ─
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  const { id } = await params
  const b = await req.json()

  // Busca a cotação atual para pegar obraplay_quotation_id e company
  const [cotacao] = await sql`
    SELECT c.*, co.obraplay_company_id FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.id = ${id}
  `
  if (!cotacao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // 1. Atualiza campos locais
  const [updated] = await sql`
    UPDATE cotacoes SET
      need_date        = ${b.need_date    ?? cotacao.need_date},
      expiry_date      = ${b.expiry_date  ?? cotacao.expiry_date},
      general_notes    = ${b.general_notes  ?? cotacao.general_notes},
      requester_name   = ${b.requester_name ?? cotacao.requester_name},
      requester_email  = ${b.requester_email ?? cotacao.requester_email},
      requester_phone  = ${b.requester_phone ?? cotacao.requester_phone},
      is_public        = ${b.is_public ?? cotacao.is_public},
      updated_at       = now()
    WHERE id = ${id}
    RETURNING *
  `

  // 2. Substitui itens se enviados
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (Array.isArray(b.items)) {
    await sql`DELETE FROM cotacao_itens WHERE cotacao_id = ${id}`
    for (const item of b.items) {
      const insumoId = item.insumo_id && UUID_RE.test(item.insumo_id) ? item.insumo_id : null
      await sql`
        INSERT INTO cotacao_itens (cotacao_id, insumo_id, name, unit, quantity)
        VALUES (${id}, ${insumoId}, ${item.name}, ${item.unit}, ${item.quantity})
      `
    }
  }

  // 3. Substitui fornecedores se enviados
  if (Array.isArray(b.suppliers)) {
    await sql`DELETE FROM cotacao_fornecedores WHERE cotacao_id = ${id}`
    for (const s of b.suppliers) {
      const mirrorId = s.mirror_company_id && Number.isInteger(s.mirror_company_id) ? s.mirror_company_id : null
      await sql`
        INSERT INTO cotacao_fornecedores
          (cotacao_id, supplier_name, supplier_city, supplier_email, supplier_phone, is_recommended, mirror_company_id)
        VALUES (${id}, ${s.name}, ${s.city ?? null}, ${s.email ?? null}, ${s.phone ?? null}, ${s.is_recommended ?? false}, ${mirrorId})
      `
    }
  }

  // 4. Integração ObraPlay: cancela a cotação anterior e reenvia nova
  let opWarning: string | undefined
  const opCompanyId: number | null = b.obraplay_company_id ?? cotacao.obraplay_company_id ?? null

  if (opCompanyId) {
    try {
      // Cancela a cotação anterior no ObraPlay
      if (cotacao.obraplay_quotation_id) {
        await obraplay.quotations.cancel(cotacao.obraplay_quotation_id, "Editada e reenviada")
      }

      // Reenvia nova cotação
      const opItems: OPQuotationItem[] = (b.items ?? []).map((item: any) => ({
        name:                  item.name,
        quantity:              Number(item.quantity) || 1,
        total_quantity_micros: Math.round((Number(item.quantity) || 1) * 1_000_000),
        measurement_unit:      item.unit ?? "UN",
        type:                  "I" as const,
      }))

      const addr = b.shipping_address ?? {}
      const shippingAddress = {
        foreign_id:        cotacao.seq ? String(cotacao.seq) + "-addr" : undefined,
        construction_name: addr.construction_name ?? b.obra_name ?? undefined,
        street:            addr.street        ?? undefined,
        number:            addr.number        ?? undefined,
        neighbourhood:     addr.neighbourhood ?? undefined,
        city:              addr.city          ?? undefined,
        state:             addr.state         ?? undefined,
        zipcode:           addr.zipcode       ?? undefined,
        complement:        addr.complement    ?? undefined,
        items:             opItems,
      }

      const answers: OPQuotationAnswer[] = (b.suppliers ?? []).map((s: any, idx: number) => ({
        foreign_id:           cotacao.seq ? String(cotacao.seq) + "-ans-" + idx : undefined,
        name:                 s.name,
        email:                s.email  || undefined,
        phone:                s.phone  || undefined,
        notify_by_email:      !!s.email,
        notify_by_whatsapp:   !s.email && !!s.phone,
        own_supplier:         false,
        ...(s.mirror_company_id ? { company: Number(s.mirror_company_id) } : {}),
        supplier_foreign_id:  s.mirror_company_id ? String(s.mirror_company_id) : undefined,
      }))

      function toOpDate(d: string | undefined | null): string | undefined {
        if (!d) return undefined
        if (d.includes("T")) return d
        return `${d}T00:00:00Z`
      }

      const opRes = await obraplay.quotations.createNested({
        company:            opCompanyId,
        requirement_date:   toOpDate(b.need_date    ?? cotacao.need_date),
        expires_at:         toOpDate(b.expiry_date  ?? cotacao.expiry_date),
        name:               b.requester_name  ?? cotacao.requester_name  ?? undefined,
        email:              b.requester_email ?? cotacao.requester_email ?? undefined,
        phone:              b.requester_phone ?? cotacao.requester_phone ?? undefined,
        foreign_id:         cotacao.seq ? String(cotacao.seq) : undefined,
        is_public:          b.is_public ?? cotacao.is_public ?? false,
        is_draft:           false,
        shipping_addresses: [shippingAddress],
        answers:            answers.length > 0 ? answers : undefined,
      })

      await sql`UPDATE cotacoes SET obraplay_quotation_id = ${opRes.id} WHERE id = ${id}`
      updated.obraplay_quotation_id = opRes.id

    } catch (err: any) {
      opWarning = "Editado localmente. Falha ao reenviar ao ObraPlay: " + (err?.message ?? "erro")
    }
  }

  return NextResponse.json({ ...updated, _op_warning: opWarning })
}
