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

  // Agrega por fornecedor: cotações recebidas/respondidas, OCs e volume
  const rows = await db`
    WITH periodo AS (
      SELECT
        cr.mirror_company_id,
        mc.short_name                          AS name,
        mc.cnpj                                AS cnpj,
        COUNT(DISTINCT cr.cotacao_id)          AS received,
        COUNT(DISTINCT cr.cotacao_id)
          FILTER (WHERE cr.answered IS TRUE)   AS answered,
        COUNT(DISTINCT oc.id)                  AS ocs_total,
        COALESCE(SUM(cr.total_quantity_micros), 0) AS volume_total_micros,
        -- detalhamento por cotação
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'identifier', c.identifier,
            'cotacao_id', cr.cotacao_id::text,
            'answered_at', cr.answered_at,
            'total_micros', cr.total_quantity_micros
          )
        ) AS cotacoes
      FROM cotacao_respostas cr
      LEFT JOIN mirror_companies mc ON mc.company_id = cr.mirror_company_id
      LEFT JOIN cotacoes c          ON c.id = cr.cotacao_id
      LEFT JOIN ordens_compra oc    ON oc.cotacao_id = cr.cotacao_id
                                   AND oc.supplier_name = cr.supplier_name
      WHERE
        cr.mirror_company_id IS NOT NULL
        AND EXTRACT(MONTH FROM cr.answered_at) = ${mes}
        AND EXTRACT(YEAR  FROM cr.answered_at) = ${ano}
        AND (
          ${q} = ''
          OR mc.short_name ILIKE ${'%' + q + '%'}
          OR mc.cnpj        ILIKE ${'%' + q + '%'}
        )
      GROUP BY cr.mirror_company_id, mc.short_name, mc.cnpj
    )
    SELECT * FROM periodo
    ORDER BY volume_total_micros DESC
  `

  // Sort server-side sobre o resultado in-memory (poucos registros por mês)
  const sortParam = new URL(req.url).searchParams.get("sort")
  const dirParam  = new URL(req.url).searchParams.get("dir")
  const SORT_KEYS: Record<string, string> = {
    name: "name", received: "received", answered: "answered",
    ocs_total: "ocs_total", volume_total_micros: "volume_total_micros",
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
