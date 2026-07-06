import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

export async function GET(req: NextRequest) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const db = neon(process.env.DATABASE_URL!)

  // Cotações geradas por dia — últimos 30 dias
  const cotacoesDiarias = await db`
    SELECT
      TO_CHAR(created_at::date, 'DD/MM') AS dia,
      COUNT(*)::int AS geradas
    FROM cotacoes
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY created_at::date
    ORDER BY created_at::date
  `

  // Respostas recebidas por dia — últimos 30 dias
  const respostasDiarias = await db`
    SELECT
      TO_CHAR(answered_at::date, 'DD/MM') AS dia,
      COUNT(DISTINCT op_answer_id)::int AS respondidas
    FROM cotacao_respostas
    WHERE answered_at >= NOW() - INTERVAL '30 days'
    GROUP BY answered_at::date
    ORDER BY answered_at::date
  `

  // Merge por dia
  const diasMap: Record<string, { dia: string; geradas: number; respondidas: number }> = {}
  for (const r of cotacoesDiarias) {
    diasMap[r.dia] = { dia: r.dia, geradas: r.geradas, respondidas: 0 }
  }
  for (const r of respostasDiarias) {
    if (diasMap[r.dia]) diasMap[r.dia].respondidas = r.respondidas
    else diasMap[r.dia] = { dia: r.dia, geradas: 0, respondidas: r.respondidas }
  }
  const lineData = Object.values(diasMap).sort((a, b) => {
    const [da, ma] = a.dia.split("/").map(Number)
    const [db2, mb] = b.dia.split("/").map(Number)
    return ma !== mb ? ma - mb : da - db2
  })

  // Volume de OCs por semana — últimas 8 semanas
  const volumeOCs = await db`
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'DD/MM') AS semana,
      COALESCE(SUM(total), 0)::float AS volume
    FROM ordens_compra
    WHERE created_at >= NOW() - INTERVAL '8 weeks'
      AND status != 'Cancelada'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at)
  `

  return NextResponse.json({ lineData, volumeOCs })
}
