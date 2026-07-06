import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const db = neon(process.env.DATABASE_URL!)

  const [oc] = await db`
    SELECT
      oc.id, oc.code, oc.status, oc.total, oc.created_at,
      oc.supplier_name, oc.supplier_email,
      oc.payment_method, oc.arrival_estimate,
      oc.obraplay_order_id, oc.obraplay_order_code,
      co.fantasy_name AS company_name,
      oc.requester_name, oc.requester_email
    FROM ordens_compra oc
    LEFT JOIN cotacoes cot ON cot.id = oc.cotacao_id
    LEFT JOIN companies co ON co.id = cot.company_id
    WHERE oc.id = ${id}
    LIMIT 1
  `

  if (!oc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const items = await db`
    SELECT name, measurement_unit AS unit, total_quantity_micros AS quantity,
           unit_price_micros, (unit_price_micros * total_quantity_micros / 1000000)::bigint AS total_micros
    FROM ordens_compra_itens
    WHERE ordem_id = ${id}
  `.catch(() => [])

  // freight
  const [freight] = await db`
    SELECT total_freight_micros AS freight_total
    FROM ordens_compra_enderecos
    WHERE ordem_id = ${id}
    LIMIT 1
  `.catch(() => [undefined])

  return NextResponse.json({
    oc: {
      ...oc,
      freight_total: freight?.freight_total ?? null,
      items,
    },
  })
}
