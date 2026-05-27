import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSession } from "@/lib/session"

// Remove acentos e normaliza para comparação
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

// Extrai tokens relevantes (≥3 chars) de uma string
function tokens(s: string): string[] {
  return norm(s)
    .split(/\s+/)
    .filter(t => t.length >= 3)
}

// Palavras genéricas que não devem influenciar o match
const STOP_WORDS = new Set([
  "para", "com", "por", "sem", "uso", "tipo", "cor", "kit",
  "und", "pct", "unidade", "pacote", "caixa", "metro", "litro",
  "kg", "saco", "rolo", "par", "peca",
])

function relevantTokens(s: string): string[] {
  return tokens(s).filter(t => !STOP_WORDS.has(t))
}

// Score de similaridade: quantos tokens do item aparecem nas categorias do fornecedor
function scoreSupplier(itemTokens: string[][], categoryTokens: string[][]): number {
  let score = 0
  for (const iTokens of itemTokens) {
    for (const it of iTokens) {
      for (const catTokens of categoryTokens) {
        for (const ct of catTokens) {
          if (ct === it) { score += 2; break }
          if (ct.includes(it) || it.includes(ct)) { score += 1; break }
        }
      }
    }
  }
  return score
}

export async function POST(req: NextRequest) {
  try { await requireSession() } catch { return NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const { items, city, state } = await req.json()

  if (!items || items.length === 0) {
    return NextResponse.json({ recommended: [], reason: null })
  }

  // Busca fornecedores da região com todos os dados necessários para o card
  const suppliers = await sql`
    SELECT
      company_id,
      short_name,
      full_name,
      city,
      state,
      email,
      phone,
      whatsapp,
      logo,
      rating,
      registration_type,
      category_names
    FROM mirror_companies
    WHERE
      has_confirmed_configuration = true
      AND category_names IS NOT NULL
      AND jsonb_array_length(category_names) > 0
      ${city ? sql`AND (lower(city) = lower(${city}) OR lower(state) = lower(${state}))` : sql``}
    ORDER BY rating DESC NULLS LAST
    LIMIT 200
  `

  if (suppliers.length === 0) {
    return NextResponse.json({ recommended: [], reason: null })
  }

  // Pré-computa tokens dos itens da cotação
  const itemsTokenized: string[][] = (items as { name: string; unit: string }[])
    .map(i => relevantTokens(i.name))
    .filter(t => t.length > 0)

  // Pontua cada fornecedor
  const scored = suppliers
    .map((s: any) => {
      const categories: string[] = Array.isArray(s.category_names) ? s.category_names : []
      const catTokenized = categories.map(c => relevantTokens(c))
      const score = scoreSupplier(itemsTokenized, catTokenized)
      return { id: s.company_id as number, score }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const recommendedIds = scored.map(s => s.id)

  // Monta objetos completos dos fornecedores recomendados (mesma ordem do score)
  const supplierMap = new Map(suppliers.map((s: any) => [s.company_id, s]))
  const recommendedSuppliers = recommendedIds
    .map(id => {
      const s = supplierMap.get(id) as any
      if (!s) return null
      return {
        id:                s.company_id,
        company_name:      s.full_name || s.short_name,
        email:             s.email ?? null,
        phone:             s.phone ?? null,
        whatsapp:          s.whatsapp ?? null,
        logo_url:          s.logo ?? null,
        rating:            s.rating ?? null,
        registration_type: s.registration_type ?? null,
        category_names:    s.category_names ?? [],
        city_name:         s.city ?? null,
        state_abbr:        s.state ?? null,
      }
    })
    .filter(Boolean)

  // Monta justificativa
  let reason: string | null = null
  if (recommendedIds.length > 0) {
    const allCats = recommendedSuppliers
      .flatMap((s: any) => (Array.isArray(s.category_names) ? s.category_names.slice(0, 2) : []))
    const uniqueCategories = [...new Set(allCats)].slice(0, 4).join(", ")
    const itemNames = (items as { name: string }[]).map(i => i.name).join(", ")
    reason = `Fornecedores selecionados com base nos itens "${itemNames}" e categorias compatíveis: ${uniqueCategories}.`
  }

  return NextResponse.json({ recommended: recommendedIds, suppliers: recommendedSuppliers, reason })
}
