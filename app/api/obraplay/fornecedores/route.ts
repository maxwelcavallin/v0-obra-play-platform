import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"

const OP_API_URL = process.env.OBRAPLAY_API_URL ?? "https://api.obraplay.com"
const OP_TOKEN   = process.env.OBRAPLAY_API_TOKEN ?? ""

export async function GET(req: NextRequest) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  if (!OP_TOKEN) {
    return NextResponse.json({ error: "OBRAPLAY_API_TOKEN não configurado" }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const city  = searchParams.get("city")  ?? ""
  const state = searchParams.get("state") ?? ""

  // Busca fornecedores que entregam na cidade/estado da obra
  // Ordenação: certificados primeiro (-is_certified), depois por avaliação (-rating)
  const params = new URLSearchParams({
    city,
    state,
    ordering: "-is_certified,-rating",
    limit: "50",
  })

  const res = await fetch(`${OP_API_URL}/api/suppliers/?${params.toString()}`, {
    headers: {
      "Authorization": `Token ${OP_TOKEN}`,
      "Accept": "application/json",
      "Accept-Language": "pt-br",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error("[obraplay/fornecedores]", res.status, body)
    return NextResponse.json({ error: "Erro ao buscar fornecedores" }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
