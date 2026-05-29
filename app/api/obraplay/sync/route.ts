import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { obraplay, type OPCompany, type OPMember } from "@/lib/obraplay-client"
import { put } from "@vercel/blob"

// GET — Status da sincronização
export async function GET() {
  try {
    const [control] = await sql`SELECT * FROM sync_control WHERE entity = 'mirror_companies'`
    const [{ count: localCount }] = await sql`SELECT COUNT(*)::int AS count FROM mirror_companies`

    return NextResponse.json({
      lastSync:    control?.last_sync_at ?? null,
      totalSynced: control?.total_synced ?? 0,
      localCount:  localCount ?? 0,
      lastError:   control?.last_error ?? null,
      needsSync:   !control?.last_sync_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — Executar sincronização
export async function POST() {
  const startedAt = new Date()
  let synced = 0
  let errors = 0
  let page   = 1
  let hasMore = true

  try {
    while (hasMore) {
      const res = await obraplay.companies.list({
        is_supplier:                  true,
        has_confirmed_configuration:  true,
        per_page:                     50,
        page,
      })

      const companies = res.results ?? []
      hasMore = !!res.next && companies.length > 0
      page++

      for (const c of companies) {
        try {
          // Fetch detalhes completos + métricas em paralelo
          const [detail, metrics] = await Promise.all([
            obraplay.companies.get(c.id).catch(() => c),
            obraplay.companies.metrics(c.id).catch(() => ({})),
          ])

          const company = detail as OPCompany & { memberships?: OPMember[] }

          // Garantia extra: nunca persiste empresa sem has_confirmed_configuration
          if (!company.has_confirmed_configuration) continue

          // Espelha logo no Vercel Blob para evitar quebra de imagem por CORS/expiração
          const logoUrl = await mirrorLogo(company.logo ?? null, company.id)

          // shipping_locations pode vir como array de IDs na resposta do client.
          // O payload bruto (detail) contém os objetos completos — usamos ele.
          const rawShipping = ((detail as any).shipping_locations ?? []) as (number | OPShippingLocation)[]
          const shippingObjs: OPShippingLocation[] = rawShipping.filter((s): s is OPShippingLocation => typeof s === "object")

          // Resolve nomes/estados a partir dos objetos completos
          const categoryNames  = resolveCategoryNames(company)
          const shippingNames  = resolveShippingNamesFromObjs(shippingObjs)
          const shippingStates = resolveShippingStatesFromObjs(shippingObjs)

          await sql`
            INSERT INTO mirror_companies (
              company_id, short_name, full_name, slug, cnpj, verified_cnpj,
              phone, email, whatsapp,
              street, number, neighbourhood, city, state, zipcode, logo,
              rating, total_reviews,
              avg_response_time_minutes, avg_finalized_answers_duration, finalized_answers_count,
              operation_types, categories, category_names,
              shipping_locations, shipping_location_names, shipping_state_names,
              has_confirmed_address, has_confirmed_shipping, has_confirmed_configuration,
              has_active_institutional_page, catalog_items_count, data_incomplete,
              payload, last_sync_at, obraplay_updated_at
            ) VALUES (
              ${company.id},
              ${company.short_name ?? company.name ?? null},
              ${company.full_name ?? null},
              ${company.slug ?? null},
              ${company.cnpj ?? null},
              ${company.verified_cnpj ?? false},
              ${company.phone ?? null},
              ${company.email ?? null},
              ${company.whatsapp ?? null},
              ${company.address ?? null},
              ${company.address_number ?? null},
              ${company.neighborhood ?? null},
              ${company.city ?? null},
              ${company.state ?? null},
              ${company.zip_code ?? null},
              ${logoUrl},
              ${company.rating ?? 0},
              ${company.total_reviews ?? 0},
              ${(metrics as any).avg_response_time_minutes ?? company.avg_response_time_minutes ?? null},
              ${(metrics as any).average_finalized_answers_duration ?? null},
              ${(metrics as any).finalized_answers_count ?? 0},
              ${JSON.stringify(company.operation_types ?? [])}::jsonb,
              ${JSON.stringify(resolveIds(company.categories ?? []))}::jsonb,
              ${JSON.stringify(categoryNames)}::jsonb,
              ${JSON.stringify(shippingObjs)}::jsonb,
              ${JSON.stringify(shippingNames)}::jsonb,
              ${JSON.stringify(shippingStates)}::jsonb,
              ${company.has_confirmed_address ?? false},
              ${company.has_confirmed_shipping ?? false},
              ${company.has_confirmed_configuration ?? false},
              ${company.has_active_institutional_page ?? false},
              ${company.catalog_items_count ?? 0},
              ${company.data_incomplete ?? false},
              ${JSON.stringify(company)}::jsonb,
              ${startedAt.toISOString()},
              ${company.updated_at ?? null}
            )
            ON CONFLICT (company_id) DO UPDATE SET
              short_name                    = EXCLUDED.short_name,
              full_name                     = EXCLUDED.full_name,
              slug                          = EXCLUDED.slug,
              cnpj                          = EXCLUDED.cnpj,
              verified_cnpj                 = EXCLUDED.verified_cnpj,
              phone                         = EXCLUDED.phone,
              email                         = EXCLUDED.email,
              whatsapp                      = EXCLUDED.whatsapp,
              street                        = EXCLUDED.street,
              number                        = EXCLUDED.number,
              neighbourhood                 = EXCLUDED.neighbourhood,
              city                          = EXCLUDED.city,
              state                         = EXCLUDED.state,
              zipcode                       = EXCLUDED.zipcode,
              logo                          = EXCLUDED.logo, -- URL do Vercel Blob (espelhada)
              rating                        = EXCLUDED.rating,
              total_reviews                 = EXCLUDED.total_reviews,
              avg_response_time_minutes     = EXCLUDED.avg_response_time_minutes,
              avg_finalized_answers_duration = EXCLUDED.avg_finalized_answers_duration,
              finalized_answers_count       = EXCLUDED.finalized_answers_count,
              operation_types               = EXCLUDED.operation_types,
              categories                    = EXCLUDED.categories,
              category_names                = EXCLUDED.category_names,
              shipping_locations            = EXCLUDED.shipping_locations, -- objetos completos {type, city, state}
              shipping_location_names       = EXCLUDED.shipping_location_names,
              shipping_state_names          = EXCLUDED.shipping_state_names,
              has_confirmed_address         = EXCLUDED.has_confirmed_address,
              has_confirmed_shipping        = EXCLUDED.has_confirmed_shipping,
              has_confirmed_configuration   = EXCLUDED.has_confirmed_configuration,
              has_active_institutional_page = EXCLUDED.has_active_institutional_page,
              catalog_items_count           = EXCLUDED.catalog_items_count,
              data_incomplete               = EXCLUDED.data_incomplete,
              payload                       = EXCLUDED.payload,
              last_sync_at                  = EXCLUDED.last_sync_at,
              obraplay_updated_at           = EXCLUDED.obraplay_updated_at
          `

          // Sync memberships — usa o array que já vem no detalhe da empresa
          const memberships: any[] = company.memberships ?? []
          for (const m of memberships) {
            // Considera ativo: sem left_at E não recusado E validado
            const isActive = !m.left_at && !m.is_refused && (m.is_validated ?? true)
            // Papel: admin, superadmin ou membro comum
            const role = m.is_superadmin ? "superadmin" : m.is_admin ? "admin" : "member"
            // Contato: prioriza email/phone do membership, depois cai no user
            const email = m.email || m.user?.email || null
            const phone = m.phone || m.user?.phone || null
            const name  = m.user?.display_name || m.user?.name || null

            await sql`
              INSERT INTO mirror_members (company_id, member_id, name, email, phone, role, is_active, payload, last_sync_at)
              VALUES (
                ${company.id},
                ${m.id},
                ${name},
                ${email},
                ${phone},
                ${role},
                ${isActive},
                ${JSON.stringify(m)}::jsonb,
                ${startedAt.toISOString()}
              )
              ON CONFLICT (company_id, member_id) DO UPDATE SET
                name         = EXCLUDED.name,
                email        = EXCLUDED.email,
                phone        = EXCLUDED.phone,
                role         = EXCLUDED.role,
                is_active    = EXCLUDED.is_active,
                payload      = EXCLUDED.payload,
                last_sync_at = EXCLUDED.last_sync_at
            `
          }

          synced++
        } catch {
          errors++
        }
      }
    }

    // Remove empresas que perderam has_confirmed_configuration desde o último sync
    await sql`
      DELETE FROM mirror_companies
      WHERE has_confirmed_configuration = false
        OR last_sync_at < ${startedAt.toISOString()}
    `

    // Atualiza sync_control
    await sql`
      UPDATE sync_control
      SET last_sync_at = ${startedAt.toISOString()}, total_synced = ${synced}, last_error = null, updated_at = now()
      WHERE entity = 'mirror_companies'
    `

    return NextResponse.json({ success: true, synced, errors })
  } catch (err: any) {
    await sql`
      UPDATE sync_control
      SET last_error = ${err.message}, updated_at = now()
      WHERE entity = 'mirror_companies'
    `.catch(() => {})
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Faz download da logo externa e salva no Vercel Blob (público).
 * Retorna a URL local do Blob, ou a URL original como fallback se falhar.
 */
async function mirrorLogo(originalUrl: string | null | undefined, companyId: number): Promise<string | null> {
  if (!originalUrl) return null
  try {
    const res = await fetch(originalUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return originalUrl
    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
    const buffer = await res.arrayBuffer()
    const blob = await put(`logos/suppliers/${companyId}.${ext}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    })
    return blob.url
  } catch {
    return originalUrl // fallback: mantém URL original se o mirror falhar
  }
}

function resolveIds(items: (number | { id: number })[]): number[] {
  return items.map(i => (typeof i === "object" ? i.id : i))
}

function resolveCategoryNames(company: OPCompany): string[] {
  if (company.category_names?.length) return company.category_names
  return (company.categories ?? [])
    .filter(c => typeof c === "object" && "name" in c)
    .map(c => (c as { name: string }).name)
}

// Estrutura real da API ObraPlay: { id, type: "state"|"city", city: {id,name,state}|null, state: {id,code,name}, ... }
type OPShippingLocation = {
  id:     number
  type:   "state" | "city" | string
  city?:  { id: number; name: string; state: number } | null
  state?: { id: number; code: string; name: string }
}

/** Extrai nomes de cidades de entrega (apenas registros type="city") */
function resolveShippingNamesFromObjs(locs: OPShippingLocation[]): string[] {
  return [...new Set(
    locs
      .filter(s => s.type === "city" && s.city?.name)
      .map(s => s.city!.name)
  )]
}

/** Extrai códigos de estado de atuação (type="state" e type="city") */
function resolveShippingStatesFromObjs(locs: OPShippingLocation[]): string[] {
  return [...new Set(
    locs
      .filter(s => s.state?.code)
      .map(s => s.state!.code)
  )]
}
