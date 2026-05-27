import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { obraplay, type OPCompany, type OPMember } from "@/lib/obraplay-client"

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

          // Resolve category_names
          const categoryNames = resolveCategoryNames(company)
          const shippingNames = resolveShippingNames(company)

          await sql`
            INSERT INTO mirror_companies (
              company_id, short_name, full_name, slug, cnpj, verified_cnpj,
              phone, email, whatsapp,
              street, number, neighbourhood, city, state, zipcode, logo,
              rating, total_reviews,
              avg_response_time_minutes, avg_finalized_answers_duration, finalized_answers_count,
              operation_types, categories, category_names,
              shipping_locations, shipping_location_names,
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
              ${company.logo ?? null},
              ${company.rating ?? 0},
              ${company.total_reviews ?? 0},
              ${(metrics as any).avg_response_time_minutes ?? company.avg_response_time_minutes ?? null},
              ${(metrics as any).average_finalized_answers_duration ?? null},
              ${(metrics as any).finalized_answers_count ?? 0},
              ${JSON.stringify(company.operation_types ?? [])}::jsonb,
              ${JSON.stringify(resolveIds(company.categories ?? []))}::jsonb,
              ${JSON.stringify(categoryNames)}::jsonb,
              ${JSON.stringify(resolveIds(company.shipping_locations ?? []))}::jsonb,
              ${JSON.stringify(shippingNames)}::jsonb,
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
              logo                          = EXCLUDED.logo,
              rating                        = EXCLUDED.rating,
              total_reviews                 = EXCLUDED.total_reviews,
              avg_response_time_minutes     = EXCLUDED.avg_response_time_minutes,
              avg_finalized_answers_duration = EXCLUDED.avg_finalized_answers_duration,
              finalized_answers_count       = EXCLUDED.finalized_answers_count,
              operation_types               = EXCLUDED.operation_types,
              categories                    = EXCLUDED.categories,
              category_names                = EXCLUDED.category_names,
              shipping_locations            = EXCLUDED.shipping_locations,
              shipping_location_names       = EXCLUDED.shipping_location_names,
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

          // Sync memberships (vendedores)
          const membershipsRes = await obraplay.companies.memberships(company.id).catch(() => ({ results: [] }))
          for (const m of (membershipsRes.results ?? [])) {
            await sql`
              INSERT INTO mirror_members (company_id, member_id, name, email, phone, role, is_active, payload, last_sync_at)
              VALUES (
                ${company.id},
                ${m.id},
                ${m.user?.name ?? null},
                ${m.user?.email ?? null},
                ${m.user?.phone ?? null},
                ${m.role ?? null},
                ${m.is_active ?? true},
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

function resolveIds(items: (number | { id: number })[]): number[] {
  return items.map(i => (typeof i === "object" ? i.id : i))
}

function resolveCategoryNames(company: OPCompany): string[] {
  if (company.category_names?.length) return company.category_names
  return (company.categories ?? [])
    .filter(c => typeof c === "object" && "name" in c)
    .map(c => (c as { name: string }).name)
}

function resolveShippingNames(company: OPCompany): string[] {
  if (company.shipping_location_names?.length) return company.shipping_location_names
  return (company.shipping_locations ?? [])
    .filter(s => typeof s === "object" && "name" in s)
    .map(s => (s as { name: string }).name)
}
