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
      c.obraplay_quotation_id, c.obraplay_quotation_code,
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

  // ── Integração ObraPlay: resolve o ID ObraPlay da empresa construtora ────────
  let opCompanyId: number | null = b.obraplay_company_id ? Number(b.obraplay_company_id) : null

  if (!opCompanyId) {
    // Busca o CNPJ da empresa no nosso banco para fazer o lookup
    const [companyRow] = await sql`SELECT cnpj, obraplay_company_id FROM companies WHERE id = ${b.company_id}`

    // Pode já ter sido salvo em outro fluxo
    if (companyRow?.obraplay_company_id) {
      opCompanyId = Number(companyRow.obraplay_company_id)
    } else if (companyRow?.cnpj) {
      // Primeira cotação: cria/busca a empresa no ObraPlay via lookup pelo CNPJ
      const rawCnpj = companyRow.cnpj.replace(/[^0-9]/g, "")
      try {
        const lookupRes = await obraplay.companies.lookup(rawCnpj)
        opCompanyId = lookupRes.id
        // Persiste para não fazer lookup novamente nas próximas cotações
        await sql`UPDATE companies SET obraplay_company_id = ${opCompanyId} WHERE id = ${b.company_id}`
        console.log(`[cotacoes] Empresa vinculada ao ObraPlay via lookup: company=${b.company_id} → op_id=${opCompanyId}`)
      } catch (lookupErr: any) {
        console.error(`[cotacoes] Falha no lookup da empresa no ObraPlay (CNPJ: ${rawCnpj}):`, lookupErr?.message ?? lookupErr)
        await sql`UPDATE cotacoes SET status = 'Erro ObraPlay' WHERE id = ${cotacao.id}`
        return NextResponse.json({
          ...cotacao,
          _op_error: `Não foi possível identificar a empresa no ObraPlay: ${lookupErr?.message ?? "erro no lookup"}`,
        }, { status: 201 })
      }
    } else {
      // Empresa sem CNPJ cadastrado — não é possível fazer lookup
      await sql`UPDATE cotacoes SET status = 'Erro ObraPlay' WHERE id = ${cotacao.id}`
      return NextResponse.json({
        ...cotacao,
        _op_error: "CNPJ da empresa não cadastrado. Preencha o CNPJ em Editar Empresa para integrar com ObraPlay.",
      }, { status: 201 })
    }
  }

  // Converte datas YYYY-MM-DD → YYYY-MM-DDT00:00:00Z (formato exigido pela API ObraPlay)
  function toOpDate(d: string | undefined | null): string | undefined {
    if (!d) return undefined
    // Já está no formato ISO completo
    if (d.includes("T")) return d
    // Converte YYYY-MM-DD → YYYY-MM-DDT00:00:00Z
    return `${d}T00:00:00Z`
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
  const addrStreet       = addr.street?.trim()        || null
  const addrNumber       = addr.number?.trim()        || null
  const addrNeighbourhood = addr.neighbourhood?.trim() || null

  // ObraPlay exige street, number e neighbourhood — se não vieram, aborta com mensagem clara
  if (!addrStreet || !addrNumber || !addrNeighbourhood) {
    const missing = [!addrStreet && "rua", !addrNumber && "número", !addrNeighbourhood && "bairro"].filter(Boolean).join(", ")
    console.error(`[cotacoes] Endereço de entrega incompleto para cotação ${cotacao.identifier}: faltando ${missing}`)
    await sql`UPDATE cotacoes SET status = 'Erro ObraPlay' WHERE id = ${cotacao.id}`
    return NextResponse.json({
      ...cotacao,
      _op_error: `Cotação salva, mas o endereço de entrega está incompleto (faltando: ${missing}). Preencha o endereço da obra ou empresa e tente novamente.`,
    }, { status: 201 })
  }

  const shippingAddress = {
    foreign_id:        cotacao.seq ? String(cotacao.seq) + "-addr" : undefined,
    construction_name: addr.construction_name ?? b.obra_name ?? undefined,
    street:            addrStreet,
    number:            addrNumber,
    neighbourhood:     addrNeighbourhood,
    city:              addr.city?.trim()     || undefined,
    state:             addr.state?.trim()    || undefined,
    zipcode:           addr.zipcode?.trim()  || undefined,
    complement:        addr.complement?.trim() || undefined,
    items:             opItems,
  }

  // Monta os fornecedores (answers) — filtra entradas sem nome para evitar erro 400
  const answers: OPQuotationAnswer[] = (b.suppliers ?? [])
    .filter((s: any) => {
      const hasName = typeof s.name === "string" && s.name.trim().length > 0
      if (!hasName) console.error(`[cotacoes] Fornecedor ignorado por não ter nome:`, JSON.stringify(s))
      return hasName
    })
    .map((s: any, idx: number) => ({
      foreign_id:          cotacao.seq ? String(cotacao.seq) + "-ans-" + idx : undefined,
      name:                s.name.trim(),
      email:               s.email?.trim() || undefined,
      phone:               s.phone?.trim() || undefined,
      notify_by_email:     !!s.email?.trim(),
      notify_by_whatsapp:  !s.email?.trim() && !!s.phone?.trim(),
      own_supplier:        false,
      ...(s.mirror_company_id ? { company: Number(s.mirror_company_id) } : {}),
      supplier_foreign_id: s.mirror_company_id ? String(s.mirror_company_id) : undefined,
    }))

  const opPayload = {
    company:            opCompanyId,
    requirement_date:   toOpDate(b.need_date),
    expires_at:         toOpDate(b.expiry_date),
    name:               b.requester_name  ?? undefined,
    email:              b.requester_email ?? undefined,
    phone:              b.requester_phone ?? undefined,
    foreign_id:         cotacao.seq ? String(cotacao.seq) : undefined,
    observations:       b.general_notes  ?? undefined,
    is_public:          b.is_public ?? false,
    is_draft:           false,
    shipping_addresses: [shippingAddress],
    answers:            answers.length > 0 ? answers : undefined,
  }

  try {
    const opRes = await obraplay.quotations.createNested(opPayload)
    const opCode = opRes.code ?? null
    await sql`
      UPDATE cotacoes
      SET obraplay_quotation_id = ${opRes.id}, obraplay_quotation_code = ${opCode}
      WHERE id = ${cotacao.id}
    `
    cotacao.obraplay_quotation_id = opRes.id
    cotacao.obraplay_quotation_code = opCode
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
