import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/session"
import { INSUMOS_SISTEMA } from "@/lib/insumos-mock"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const company_id = req.nextUrl.searchParams.get("company_id")
    const tab = req.nextUrl.searchParams.get("tab") ?? "sistema" // "sistema" | "meus"

    if (tab === "meus") {
      // Apenas insumos personalizados da empresa
      if (!company_id) return NextResponse.json({ error: "company_id obrigatório" }, { status: 400 })
      const rows = await sql`
        SELECT * FROM insumos
        WHERE company_id = ${company_id} AND origin = 'Personalizado'
        ORDER BY created_at DESC
      `
      return NextResponse.json(rows)
    }

    // Padrão (tab=sistema ou sem tab): retorna sistema + próprios mesclados
    const sistemaMapped = INSUMOS_SISTEMA.map((i: any) => ({ ...i, origin: "Sistema" }))

    if (company_id) {
      const proprios = await sql`
        SELECT * FROM insumos
        WHERE company_id = ${company_id} AND origin = 'Personalizado'
        ORDER BY created_at DESC
      `
      // Próprios primeiro, depois sistema
      return NextResponse.json([...proprios, ...sistemaMapped])
    }

    return NextResponse.json(sistemaMapped)
  } catch (err: any) {
    console.error("[api/insumos GET]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// R4: Calcula similaridade de Jaccard por bigramas entre duas strings (0–1)
function similarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const n = s.toLowerCase().replace(/\s+/g, " ").trim()
    const set = new Set<string>()
    for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2))
    return set
  }
  const sa = bigrams(a)
  const sb = bigrams(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let intersection = 0
  sa.forEach(bg => { if (sb.has(bg)) intersection++ })
  return intersection / (sa.size + sb.size - intersection)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const b = await req.json()
    if (!b.name || !b.unit || !b.category) {
      return NextResponse.json({ error: "Nome, unidade e categoria são obrigatórios" }, { status: 400 })
    }

    // R4: busca insumos similares (≥70% match) antes de salvar
    // O parâmetro skip_similarity_check=true permite ao frontend confirmar e prosseguir
    if (!b.skip_similarity_check) {
      const existing = await sql`
        SELECT id, name, unit, category, origin FROM insumos
        WHERE (company_id = ${b.company_id} OR company_id IS NULL)
        ORDER BY name
      `
      const { INSUMOS_SISTEMA } = await import("@/lib/insumos-mock")
      const allNames = [
        ...existing.map((r: any) => ({ id: r.id, name: r.name, unit: r.unit, category: r.category, origin: r.origin })),
        ...INSUMOS_SISTEMA.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, origin: "Sistema" })),
      ]
      const matches = allNames
        .map(item => ({ ...item, score: similarity(b.name, item.name) }))
        .filter(item => item.score >= 0.70)
        .sort((a, z) => z.score - a.score)
        .slice(0, 5)

      if (matches.length > 0) {
        return NextResponse.json({ similar: true, matches }, { status: 409 })
      }
    }

    const rows = await sql`
      INSERT INTO insumos (name, unit, category, internal_code, description, origin, company_id)
      VALUES (
        ${b.name.trim()}, ${b.unit}, ${b.category},
        ${b.internal_code ?? null}, ${b.description ?? null},
        'Personalizado', ${b.company_id}
      )
      RETURNING *
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    console.error("[api/insumos POST]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
