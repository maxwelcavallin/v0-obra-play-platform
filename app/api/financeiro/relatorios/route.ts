import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

// GET /api/financeiro/relatorios?company_id=&tipo=dashboard|fluxo|extrato_obra|contas_pagar&months=6&obra_id=
export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const p = req.nextUrl.searchParams
    const companyId = p.get("company_id")
    const tipo      = p.get("tipo") ?? "dashboard"

    if (!companyId) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
    console.log("[relatorios GET] company:", companyId, "tipo:", tipo)

    // Dashboard: cards resumo + gráfico 6 meses + próximos vencimentos
    if (tipo === "dashboard") {
      const today = new Date().toISOString().split("T")[0]

      // Sumário do mês atual
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
      const monthEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`

      const [summary] = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN type='receita' AND status='pago'    THEN amount ELSE 0 END),0) AS receitas_pagas,
          COALESCE(SUM(CASE WHEN type='despesa' AND status='pago'    THEN amount ELSE 0 END),0) AS despesas_pagas,
          COALESCE(SUM(CASE WHEN type='receita' AND status='pendente' THEN amount ELSE 0 END),0) AS a_receber,
          COALESCE(SUM(CASE WHEN type='despesa' AND status='pendente' THEN amount ELSE 0 END),0) AS a_pagar,
          COALESCE(SUM(CASE WHEN type='receita' THEN amount ELSE -amount END),0)                AS resultado_mes
        FROM transactions
        WHERE company_id = ${companyId}
          AND deleted_at IS NULL
          AND due_date BETWEEN ${monthStart}::date AND ${monthEnd}::date
      `

      // Gráfico últimos 6 meses
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0]

      const chart = await sql`
        SELECT
          TO_CHAR(due_date, 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN type='receita' AND status='pago' THEN amount ELSE 0 END),0) AS receitas,
          COALESCE(SUM(CASE WHEN type='despesa' AND status='pago' THEN amount ELSE 0 END),0) AS despesas
        FROM transactions
        WHERE company_id = ${companyId}
          AND deleted_at IS NULL
          AND due_date >= ${sixMonthsAgoStr}::date
        GROUP BY TO_CHAR(due_date, 'YYYY-MM')
        ORDER BY month
      `

      // Próximos 5 vencimentos
      const vencimentos = await sql`
        SELECT
          t.id, t.description, t.amount, t.type, t.due_date,
          cat.name AS category_name, cat.color AS category_color
        FROM transactions t
        LEFT JOIN transaction_categories cat ON cat.id = t.category_id
        WHERE t.company_id = ${companyId}
          AND t.deleted_at IS NULL
          AND t.status = 'pendente'
          AND t.due_date >= ${today}::date
        ORDER BY t.due_date ASC
        LIMIT 5
      `

      return NextResponse.json({ summary, chart, vencimentos })
    }

    // Fluxo de caixa mensal
    if (tipo === "fluxo") {
      const months = Math.min(Math.max(Number(p.get("months") ?? 12), 1), 24)
      // Calcula a data de corte no JS para evitar interpolação de string em SQL
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - months)
      const cutoffStr = cutoff.toISOString().split("T")[0]

      const rows = await sql`
        SELECT
          TO_CHAR(due_date, 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN type='receita' AND status='pago'     THEN amount ELSE 0 END),0) AS receitas,
          COALESCE(SUM(CASE WHEN type='despesa' AND status='pago'     THEN amount ELSE 0 END),0) AS despesas,
          COALESCE(SUM(CASE WHEN type='receita' AND status='pendente' THEN amount ELSE 0 END),0) AS a_receber,
          COALESCE(SUM(CASE WHEN type='despesa' AND status='pendente' THEN amount ELSE 0 END),0) AS a_pagar
        FROM transactions
        WHERE company_id = ${companyId}
          AND deleted_at IS NULL
          AND due_date >= ${cutoffStr}::date
        GROUP BY TO_CHAR(due_date, 'YYYY-MM')
        ORDER BY month
      `
      return NextResponse.json(rows)
    }

    // Extrato por obra
    if (tipo === "extrato_obra") {
      const obraId = p.get("obra_id")
      if (!obraId) return NextResponse.json({ error: "obra_id obrigatório para este relatório" }, { status: 400 })

      const rows = await sql`
        SELECT
          t.id, t.description, t.amount, t.type, t.status,
          t.due_date, t.paid_at,
          cat.name AS category_name, cat.color AS category_color,
          acc.name AS account_name
        FROM transactions t
        LEFT JOIN transaction_categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.company_id = ${companyId}
          AND t.obra_id = ${obraId}::uuid
          AND t.deleted_at IS NULL
        ORDER BY t.due_date DESC
      `
      const [totals] = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN type='receita' THEN amount ELSE 0 END),0) AS total_receitas,
          COALESCE(SUM(CASE WHEN type='despesa' THEN amount ELSE 0 END),0) AS total_despesas
        FROM transactions
        WHERE company_id = ${companyId} AND obra_id = ${obraId}::uuid AND deleted_at IS NULL
      `
      return NextResponse.json({ rows, totals })
    }

    // Contas a pagar/receber
    if (tipo === "contas_pagar") {
      const rows = await sql`
        SELECT
          t.id, t.description, t.amount, t.type, t.due_date,
          c.full_name AS client_name, c.fantasy_name AS client_fantasy,
          cat.name AS category_name,
          acc.name AS account_name
        FROM transactions t
        LEFT JOIN clients c ON c.id = t.client_id
        LEFT JOIN transaction_categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.company_id = ${companyId}
          AND t.status = 'pendente'
          AND t.deleted_at IS NULL
        ORDER BY t.due_date ASC
      `
      return NextResponse.json(rows)
    }

    return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 })
  } catch (err: any) {
    console.error("[relatorios GET] erro:", err?.message ?? err)
    if (err?.message === "Não autenticado") return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
