import { NextRequest, NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

export async function POST(req: NextRequest) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const { items, city, state } = await req.json()

  if (!items || items.length === 0) {
    return NextResponse.json({ recommended: [] })
  }

  // Busca fornecedores da região com suas categorias
  const suppliers = await sql`
    SELECT
      company_id,
      short_name,
      full_name,
      city,
      state,
      category_names
    FROM mirror_companies
    WHERE
      has_confirmed_configuration = true
      AND category_names IS NOT NULL
      AND jsonb_array_length(category_names) > 0
      ${city ? sql`AND (lower(city) = lower(${city}) OR lower(state) = lower(${state}))` : sql``}
    ORDER BY rating DESC NULLS LAST
    LIMIT 120
  `

  if (suppliers.length === 0) {
    return NextResponse.json({ recommended: [] })
  }

  // Formata lista para o LLM
  const supplierList = suppliers.map((s: any) => ({
    id: s.company_id,
    name: s.short_name || s.full_name,
    categories: Array.isArray(s.category_names) ? s.category_names : [],
    city: s.city,
    state: s.state,
  }))

  const itemNames = (items as { name: string; unit: string }[]).map(i => `${i.name} (${i.unit})`).join(", ")

  const { experimental_output } = await generateText({
    model: "openai/gpt-4o-mini",
    experimental_output: Output.object({
      schema: z.object({
        recommended_ids: z.array(z.number()).describe(
          "IDs dos fornecedores recomendados para os itens da cotação, em ordem de relevância. Máximo 8."
        ),
        reason: z.string().nullable().describe("Breve justificativa da seleção em português"),
      }),
    }),
    system: `Você é um assistente especializado em construção civil e compras de materiais.
Analise os itens de uma cotação e selecione os fornecedores mais adequados com base em suas categorias de atuação.
Considere apenas fornecedores cujas categorias sejam compatíveis com os materiais/serviços solicitados.
Retorne no máximo 8 fornecedores mais relevantes.`,
    prompt: `Itens da cotação: ${itemNames}

Fornecedores disponíveis (id, nome, categorias):
${supplierList.map(s => `- ID ${s.id}: ${s.name} | Categorias: ${s.categories.join(", ")}`).join("\n")}

Selecione os fornecedores cujas categorias sejam mais compatíveis com os itens solicitados.`,
  })

  const recommendedIds: number[] = experimental_output?.recommended_ids ?? []

  return NextResponse.json({
    recommended: recommendedIds,
    reason: experimental_output?.reason ?? null,
    suppliers: supplierList.filter(s => recommendedIds.includes(s.id)),
  })
}
