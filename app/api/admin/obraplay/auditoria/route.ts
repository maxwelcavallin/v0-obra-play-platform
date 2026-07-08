import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)
  const { searchParams } = new URL(req.url)
  const mes = Number(searchParams.get("mes") ?? new Date().getMonth() + 1)
  const ano = Number(searchParams.get("ano") ?? new Date().getFullYear())
  const q   = searchParams.get("q") ?? ""
  const tipo = searchParams.get("tipo") ?? "todos" // todos | marketplace | proprio

  const rows = await db`
    WITH base AS (
      SELECT
        cr.mirror_company_id,
        mc.short_name                                      AS name,
        mc.cnpj                                            AS cnpj,
        -- Tipo de cotação: own_supplier no raw_payload
        -- own_supplier=true → Próprio, false/null → Marketplace
        COALESCE((cr.raw_payload->>'own_supplier')::boolean, false) AS is_proprio,
        cr.cotacao_id,
        cr.answered_at,
        c.identifier,
        COALESCE(cr.total_quantity_micros, 0)              AS item_total_micros
      FROM cotacao_respostas cr
      LEFT JOIN mirror_companies mc ON mc.company_id = cr.mirror_company_id
      LEFT JOIN cotacoes c          ON c.id = cr.cotacao_id
      WHERE
        cr.mirror_company_id IS NOT NULL
        AND mc.verified_cnpj IS TRUE
        AND EXTRACT(MONTH FROM cr.answered_at) = ${mes}
        AND EXTRACT(YEAR  FROM cr.answered_at) = ${ano}
        AND (
          ${q} = ''
          OR mc.short_name ILIKE ${'%' + q + '%'}
          OR mc.cnpj        ILIKE ${'%' + q + '%'}
        )
        AND (
          ${tipo} = 'todos'
          OR (${tipo} = 'marketplace' AND COALESCE((cr.raw_payload->>'own_supplier')::boolean, false) = false)
          OR (${tipo} = 'proprio'     AND (cr.raw_payload->>'own_supplier')::boolean = true)
        )
    ),
    agg AS (
      SELECT
        mirror_company_id,
        name,
        cnpj,
        COUNT(DISTINCT cotacao_id)                         AS received,
        COUNT(DISTINCT cotacao_id)
          FILTER (WHERE answered_at IS NOT NULL)           AS answered,
        COUNT(DISTINCT cotacao_id)
          FILTER (WHERE NOT is_proprio)                    AS ocs_marketplace,
        COUNT(DISTINCT cotacao_id)
          FILTER (WHERE is_proprio)                        AS ocs_proprio,
        COALESCE(SUM(item_total_micros), 0)                AS volume_total_micros,
        COALESCE(SUM(item_total_micros) FILTER (WHERE NOT is_proprio), 0) AS volume_marketplace_micros,
        COALESCE(SUM(item_total_micros) FILTER (WHERE is_proprio), 0)     AS volume_proprio_micros,
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'identifier',  identifier,
            'cotacao_id',  cotacao_id::text,
            'answered_at', answered_at,
            'is_proprio',  is_proprio,
            'total_micros', item_total_micros
          )
        )                                                  AS cotacoes
      FROM base
      GROUP BY mirror_company_id, name, cnpj
    )
    SELECT
      agg.*,
      (ocs_marketplace + ocs_proprio)::int AS ocs_total
    FROM agg
    ORDER BY volume_total_micros DESC
  `

  // Sort server-side sobre resultado in-memory
  const sortParam = searchParams.get("sort")
  const dirParam  = searchParams.get("dir")
  const SORT_KEYS: Record<string, string> = {
    name: "name", received: "received", answered: "answered",
    ocs_total: "ocs_total", ocs_marketplace: "ocs_marketplace", ocs_proprio: "ocs_proprio",
    volume_total_micros: "volume_total_micros", volume_marketplace_micros: "volume_marketplace_micros",
    volume_proprio_micros: "volume_proprio_micros",
  }
  if (sortParam && SORT_KEYS[sortParam]) {
    rows.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const av = Number(a[sortParam] ?? 0)
      const bv = Number(b[sortParam] ?? 0)
      const sv = String(a[sortParam] ?? "").localeCompare(String(b[sortParam] ?? ""), "pt-BR")
      const cmp = !isNaN(av) && !isNaN(bv) ? av - bv : sv
      return dirParam === "asc" ? cmp : -cmp
    })
  }

  return NextResponse.json({ rows })
}
