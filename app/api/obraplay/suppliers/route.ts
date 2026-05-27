import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { sql } from "@/lib/db"
import { obraplay } from "@/lib/obraplay-client"

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RegistrationType = "certified" | "validated" | "basic"

function registrationType(row: any): RegistrationType {
  if (row.verified_cnpj && row.has_confirmed_address && row.has_confirmed_shipping) return "certified"
  if (row.verified_cnpj) return "validated"
  return "basic"
}

function parseResponseMinutes(duration: string | null): number {
  if (!duration) return Infinity
  const h = duration.match(/(\d+)h/)
  const m = duration.match(/(\d+)min/)
  const hours = h ? parseInt(h[1]) : 0
  const mins  = m ? parseInt(m[1]) : 0
  return hours * 60 + mins || Infinity
}

const TYPE_ORDER: Record<RegistrationType, number> = { certified: 0, validated: 1, basic: 2 }

function sortSuppliers(list: any[]) {
  return list.sort((a, b) => {
    // 1. Credenciados primeiro (certified → validated → basic)
    const typeCompare = TYPE_ORDER[a.registration_type as RegistrationType] - TYPE_ORDER[b.registration_type as RegistrationType]
    if (typeCompare !== 0) return typeCompare

    const aCount = a.finalized_answers_count ?? 0
    const bCount = b.finalized_answers_count ?? 0
    const aHas = aCount > 0
    const bHas = bCount > 0

    // 2. Quem tem respostas vem antes de quem não tem
    if (aHas !== bHas) return aHas ? -1 : 1

    if (aHas && bHas) {
      // 3. Entre os que têm respostas: maior quantidade primeiro
      if (bCount !== aCount) return bCount - aCount
      // 4. Empate na quantidade: menor tempo de resposta primeiro
      return parseResponseMinutes(a.avg_finalized_answers_duration) - parseResponseMinutes(b.avg_finalized_answers_duration)
    }

    // 5. Entre os que não têm respostas: ordem alfabética
    return (a.company_name ?? "").localeCompare(b.company_name ?? "", "pt-BR")
  })
}

function mapLocalRow(row: any) {
  const reg = registrationType(row)
  return {
    id:                           row.company_id,
    company_name:                 row.short_name ?? row.full_name,
    trade_name:                   row.full_name ?? null,
    cnpj:                         row.cnpj ?? null,
    email:                        row.email ?? null,
    phone:                        row.phone ?? null,
    whatsapp:                     row.whatsapp ?? null,
    address:                      [row.street, row.number].filter(Boolean).join(", ") || null,
    full_address:                 [row.street, row.number, row.neighbourhood, row.city, row.state].filter(Boolean).join(", ") || null,
    neighborhood:                 row.neighbourhood ?? null,
    city_name:                    row.city ?? null,
    state_abbr:                   row.state ?? null,
    zip_code:                     row.zipcode ?? null,
    logo_url:                     row.logo ?? null,
    rating:                       row.rating ?? 0,
    total_reviews:                row.total_reviews ?? 0,
    avg_response_time_minutes:    row.avg_response_time_minutes ?? null,
    avg_finalized_answers_duration: row.avg_finalized_answers_duration ?? null,
    finalized_answers_count:      row.finalized_answers_count ?? 0,
    registration_type:            reg,
    is_certified:                 reg === "certified",
    is_validated:                 reg === "validated",
    is_verified:                  row.verified_cnpj ?? false,
    verified_cnpj:                row.verified_cnpj ?? false,
    category_names:               row.category_names ?? [],
    operation_types:              row.operation_types ?? [],
    shipping_location_names:      row.shipping_location_names ?? [],
    shipping_state_names:         row.shipping_state_names ?? [],
    catalog_items_count:          row.catalog_items_count ?? 0,
    has_active_institutional_page: row.has_active_institutional_page ?? false,
    data_incomplete:              row.data_incomplete ?? false,
    slug:                         row.slug ?? null,
  }
}

function mapRealtimeRow(c: any) {
  return {
    id:            c.id,
    company_name:  c.name ?? c.short_name ?? "",
    trade_name:    c.full_name ?? null,
    city_name:     c.city ?? null,
    state_abbr:    c.state ?? null,
    slug:          c.slug ?? null,
    email:         c.email ?? null,
    phone:         c.phone ?? null,
    whatsapp:      c.whatsapp ?? null,
    logo_url:      c.logo ?? null,
    rating:        c.rating ?? 0,
    is_verified:   c.verified_cnpj ?? false,
    registration_type: "basic" as RegistrationType,
    is_certified:  false,
    is_validated:  false,
  }
}

// ─── GET — Listar fornecedores ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try { await requireSession() } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const sp         = req.nextUrl.searchParams
  const source     = sp.get("source")             // "obraplay" = tempo real
  const search     = sp.get("search")     ?? ""
  const state      = sp.get("state")      ?? ""
  const city       = sp.get("city")       ?? ""
  const minRating  = parseFloat(sp.get("min_rating") ?? "0") || 0
  const typeFilter = sp.get("type")       ?? "all"       // insumos | servicos | all
  const regTypes   = sp.get("registration_types")?.split(",").filter(Boolean) ?? []
  const page       = parseInt(sp.get("page")     ?? "1")  || 1
  const perPage    = parseInt(sp.get("per_page") ?? "20") || 20

  // ── Modo tempo real ──────────────────────────────────────────────────────
  if (source === "obraplay") {
    try {
      const res = await obraplay.companies.list({
        is_supplier: true,
        state:  state  || undefined,
        city:   city   || undefined,
        search: search || undefined,
        page,
        per_page: perPage,
      })
      const suppliers = (res.results ?? []).map(mapRealtimeRow)
      return NextResponse.json({ suppliers, total: res.count, page, perPage, source: "obraplay" })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ── Modo local (mirror) ──────────────────────────────────────────────────
  const [{ count: localCount }] = await sql`SELECT COUNT(*)::int AS count FROM mirror_companies WHERE has_confirmed_configuration = true`
  if ((localCount ?? 0) === 0) {
    return NextResponse.json({ suppliers: [], total: 0, page, perPage, needsSync: true, source: "local" })
  }

  const offset = (page - 1) * perPage
  const searchPct = search ? `%${search}%` : null

  // Para busca por cidade: descobre o(s) estado(s) ao qual a cidade pertence no mirror
  // para incluir fornecedores que cobrem o estado inteiro (type="state", shipping_location_names vazio)
  let cityStates: string[] = []
  if (city) {
    const stateRows = await sql`
      SELECT DISTINCT loc->'state'->>'code' AS code
      FROM mirror_companies,
           jsonb_array_elements(shipping_locations) AS loc
      WHERE has_confirmed_configuration = true
        AND loc->>'type' = 'city'
        AND lower(loc->'city'->>'name') = lower(${city})
        AND loc->'state'->>'code' IS NOT NULL
    `
    cityStates = stateRows.map((r: any) => r.code).filter(Boolean)
  }

  // Filtro de cidade:
  //   1) fornecedor tem a cidade exata em shipping_location_names (comparação exata, case-insensitive)  OU
  //   2) fornecedor cobre o estado inteiro (shipping_location_names vazio) e o estado está em shipping_state_names
  const cityFilter = city
    ? sql`AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements_text(shipping_location_names) AS loc_city WHERE lower(loc_city) = lower(${city}))
        ${cityStates.length > 0
          ? sql`OR (
              jsonb_array_length(shipping_location_names) = 0
              AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(shipping_state_names) AS s WHERE s = ANY(${cityStates}::text[]))
            )`
          : sql``}
      )`
    : sql``

  const rows = await sql`
    SELECT * FROM mirror_companies
    WHERE has_confirmed_configuration = true
      ${search ? sql`AND (short_name ILIKE ${searchPct} OR full_name ILIKE ${searchPct} OR cnpj ILIKE ${searchPct})` : sql``}
      ${state  ? sql`AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(shipping_state_names) AS s WHERE s ILIKE ${state})` : sql``}
      ${cityFilter}
      ${minRating > 0 ? sql`AND rating >= ${minRating}` : sql``}
      ${typeFilter === "insumos"  ? sql`AND operation_types @> '["product"]'::jsonb`  : sql``}
      ${typeFilter === "servicos" ? sql`AND operation_types @> '["service"]'::jsonb` : sql``}
    LIMIT ${perPage} OFFSET ${offset}
  `

  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM mirror_companies
    WHERE has_confirmed_configuration = true
      ${search ? sql`AND (short_name ILIKE ${searchPct} OR full_name ILIKE ${searchPct} OR cnpj ILIKE ${searchPct})` : sql``}
      ${state  ? sql`AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(shipping_state_names) AS s WHERE s ILIKE ${state})` : sql``}
      ${cityFilter}
      ${minRating > 0 ? sql`AND rating >= ${minRating}` : sql``}
      ${typeFilter === "insumos"  ? sql`AND operation_types @> '["product"]'::jsonb`  : sql``}
      ${typeFilter === "servicos" ? sql`AND operation_types @> '["service"]'::jsonb` : sql``}
  `

  let suppliers = rows.map(mapLocalRow)

  // Filtro por registration_type (post-query)
  if (regTypes.length > 0) {
    suppliers = suppliers.filter(s => regTypes.includes(s.registration_type))
  }

  sortSuppliers(suppliers)

  // Carrega membros (vendedores) de cada empresa para exibição no card
  const companyIds = suppliers.map(s => s.id)
  let membersMap: Record<number, any[]> = {}
  if (companyIds.length > 0) {
    const memberRows = await sql`
      SELECT id, company_id, member_id, name, email, phone, role, is_active
      FROM mirror_members
      WHERE company_id = ANY(${companyIds}::int[])
        AND is_active = true
      ORDER BY company_id, role DESC, name
    `
    for (const m of memberRows) {
      if (!membersMap[m.company_id]) membersMap[m.company_id] = []
      membersMap[m.company_id].push({ id: m.member_id, name: m.name, email: m.email, phone: m.phone, role: m.role })
    }
  }

  const suppliersWithMembers = suppliers.map(s => ({ ...s, members: membersMap[s.id] ?? [] }))

  return NextResponse.json({ suppliers: suppliersWithMembers, total: total ?? 0, page, perPage, needsSync: false, source: "local" })
}

// ─── POST — Dropdowns (categorias, estados, cidades) ─────────────────────────

export async function POST(req: NextRequest) {
  try { await requireSession() } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.action === "get_categories") {
    const rows = await sql`SELECT DISTINCT jsonb_array_elements_text(category_names) AS name FROM mirror_companies WHERE has_confirmed_configuration = true ORDER BY name`
    return NextResponse.json({ categories: rows.map(r => r.name), source: "local" })
  }

  if (body.action === "get_states") {
    // Retorna estados únicos de atuação (shipping_state_names), não da sede
    const rows = await sql`
      SELECT DISTINCT jsonb_array_elements_text(shipping_state_names) AS state
      FROM mirror_companies
      WHERE has_confirmed_configuration = true
        AND jsonb_array_length(shipping_state_names) > 0
      ORDER BY state
    `
    return NextResponse.json({ states: rows.map(r => r.state), source: "local" })
  }

  if (body.action === "get_cities") {
    // Retorna cidades únicas de entrega usando shipping_location_names (array de strings)
    const rows = body.state
      ? await sql`
          SELECT DISTINCT jsonb_array_elements_text(shipping_location_names) AS city
          FROM mirror_companies
          WHERE has_confirmed_configuration = true
            AND jsonb_array_length(shipping_location_names) > 0
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(shipping_state_names) AS s
              WHERE s ILIKE ${body.state}
            )
          ORDER BY city
        `
      : await sql`
          SELECT DISTINCT jsonb_array_elements_text(shipping_location_names) AS city
          FROM mirror_companies
          WHERE has_confirmed_configuration = true
            AND jsonb_array_length(shipping_location_names) > 0
          ORDER BY city
        `
    return NextResponse.json({ cities: rows.map(r => r.city), source: "local" })
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
