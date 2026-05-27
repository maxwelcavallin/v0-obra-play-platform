import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"
import { obraplay } from "@/lib/obraplay-client"
import type { OPQuotationAnswer, OPQuotationItem } from "@/lib/obraplay-client"

export const dynamic = "force-dynamic"

function genIdentifier() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function GET(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const company_id = req.nextUrl.searchParams.get("company_id")
  if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const rows = await sql`
    SELECT
      c.id, c.identifier, c.status, c.need_date, c.expiry_date, c.response_date,
      c.requester_name, c.created_at, c.updated_at,
      o.name AS obra_name, o.delivery_city, o.delivery_state,
      (SELECT COUNT(*)::int FROM cotacao_itens WHERE cotacao_id = c.id) AS item_count,
      (SELECT COUNT(*)::int FROM cotacao_fornecedores WHERE cotacao_id = c.id) AS supplier_count,
      u.name AS created_by_name
    FROM cotacoes c
    LEFT JOIN obras o ON o.id = c.obra_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.company_id = ${company_id}
    ORDER BY c.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  let session
  try { session = await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const b = await req.json()
  if (!b.company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })

  const identifier = genIdentifier()

  const [cotacao] = await sql`
    INSERT INTO cotacoes (company_id, obra_id, identifier, status, need_date, expiry_date,
      general_notes, address_type, is_public,
      requester_name, requester_email, requester_phone, created_by)
    VALUES (
      ${b.company_id}, ${b.obra_id ?? null}, ${identifier}, 'Nova',
      ${b.need_date ?? null}, ${b.expiry_date ?? null},
      ${b.general_notes ?? null}, ${b.address_type ?? "entrega"}, ${b.is_public ?? false},
      ${b.requester_name ?? null}, ${b.requester_email ?? null}, ${b.requester_phone ?? null},
      ${session.userId}
    )
    RETURNING *
  `

  // Inserir itens
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (Array.isArray(b.items) && b.items.length > 0) {
    for (const item of b.items) {
      const insumoId = item.insumo_id && UUID_RE.test(item.insumo_id) ? item.insumo_id : null
      await sql`
        INSERT INTO cotacao_itens (cotacao_id, insumo_id, name, unit, quantity)
        VALUES (${cotacao.id}, ${insumoId}, ${item.name}, ${item.unit}, ${item.quantity})
      `
    }
  }

  // Inserir fornecedores — cada registro é um destinatário independente
  if (Array.isArray(b.suppliers) && b.suppliers.length > 0) {
    for (const s of b.suppliers) {
      const mirrorId = s.mirror_company_id && Number.isInteger(s.mirror_company_id) ? s.mirror_company_id : null
      await sql`
        INSERT INTO cotacao_fornecedores
          (cotacao_id, supplier_name, supplier_city, supplier_email, supplier_phone, is_recommended, mirror_company_id)
        VALUES
          (${cotacao.id}, ${s.name}, ${s.city ?? null}, ${s.email ?? null}, ${s.phone ?? null}, ${s.is_recommended ?? false}, ${mirrorId})
      `
    }
  }

  // ── Integração ObraPlay: envia via POST /api/quotations/nested/ ─────────────
  const opCompanyId: number | null = b.obraplay_company_id ? Number(b.obraplay_company_id) : null

  if (!opCompanyId) {
    // Cotação salva localmente, mas sem vínculo ObraPlay
    await sql`UPDATE cotacoes SET status = 'Erro ObraPlay' WHERE id = ${cotacao.id}`
    return NextResponse.json({
      ...cotacao,
      _op_error: "ID ObraPlay não configurado para esta empresa. Configure em Editar Empresa antes de criar cotações.",
    }, { status: 201 })
  }

  // Monta os itens — type "I" = item avulso, measurement_unit como string
  const opItems: OPQuotationItem[] = (b.items ?? []).map((item: any) => ({
    name:                  item.name,
    quantity:              Number(item.quantity) || 1,
    total_quantity_micros: Math.round((Number(item.quantity) || 1) * 1_000_000),
    measurement_unit:      item.unit ?? "UN",
    type:                  "I" as const,
  }))

  // Monta o endereço de entrega
  const addr = b.shipping_address ?? {}
  const shippingAddress = {
    foreign_id:        `${identifier}-addr`,
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

  // Monta os fornecedores (answers)
  const answers: OPQuotationAnswer[] = (b.suppliers ?? []).map((s: any, idx: number) => ({
    foreign_id:          `${identifier}-ans-${idx}`,
    name:                s.name,
    email:               s.email  || undefined,
    phone:               s.phone  || undefined,
    notify_by_email:     !!s.email,
    notify_by_whatsapp:  !s.email && !!s.phone,
    own_supplier:        false,
    ...(s.mirror_company_id ? { company: Number(s.mirror_company_id) } : {}),
    supplier_foreign_id: s.mirror_company_id ? String(s.mirror_company_id) : undefined,
  }))

  const opPayload = {
    company:            opCompanyId,
    requirement_date:   b.need_date    ?? undefined,
    expires_at:         b.expiry_date  ?? undefined,
    name:               b.requester_name  ?? undefined,
    email:              b.requester_email ?? undefined,
    phone:              b.requester_phone ?? undefined,
    foreign_id:         identifier,
    observations:       b.general_notes  ?? undefined,
    is_public:          b.is_public ?? false,
    is_draft:           false,
    shipping_addresses: [shippingAddress],
    answers:            answers.length > 0 ? answers : undefined,
  }

  try {
    const opRes = await obraplay.quotations.createNested(opPayload)
    await sql`UPDATE cotacoes SET obraplay_quotation_id = ${opRes.id} WHERE id = ${cotacao.id}`
    cotacao.obraplay_quotation_id = opRes.id
    return NextResponse.json(cotacao, { status: 201 })
  } catch (err: any) {
    const errMsg = err?.message ?? "Erro desconhecido"
    console.error(`[cotacoes] Falha ao enviar cotação ${identifier} para ObraPlay:`, errMsg)
    // Atualiza status para indicar falha na integração
    await sql`UPDATE cotacoes SET status = 'Erro ObraPlay' WHERE id = ${cotacao.id}`
    return NextResponse.json({
      ...cotacao,
      _op_error: `Cotação salva (${identifier}), mas falha ao enviar ao ObraPlay: ${errMsg}`,
    }, { status: 201 })
  }
}
