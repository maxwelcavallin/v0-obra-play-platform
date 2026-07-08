import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

const BASE_URL = process.env.OBRAPLAY_API_URL ?? ""
const TOKEN    = process.env.OBRAPLAY_API_TOKEN ?? ""

async function opFetch(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization:  `Token ${TOKEN}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
      "Accept-Language": "pt-br",
    },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`ObraPlay ${res.status} ${path}`)
  return res.json()
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const err = await requirePlatformAdminApi(req)
  if (err) return err

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get("tab") ?? "cotacoes"
  const dateGte = searchParams.get("gte") ?? ""
  const dateLte = searchParams.get("lte") ?? ""

  try {
    if (tab === "cotacoes") {
      const qs = new URLSearchParams({ page_size: "50" })
      if (dateGte) qs.set("published_at__gte", dateGte)
      if (dateLte) qs.set("published_at__lte", dateLte)
      const data = await opFetch(`/api/companies/${id}/quotation_answers/?${qs}`)
      return NextResponse.json({ results: data?.results ?? data ?? [] })
    }

    if (tab === "avaliacoes") {
      const data = await opFetch(`/api/companies/${id}/reviews/?page_size=50`)
      return NextResponse.json({ results: data?.results ?? data ?? [] })
    }

    if (tab === "vitrine") {
      const data = await opFetch(`/api/companies/${id}/portfolio_items/?page_size=50`)
      return NextResponse.json({ results: data?.results ?? data ?? [] })
    }

    if (tab === "metricas") {
      const data = await opFetch(`/api/companies/${id}/metrics/`)
      return NextResponse.json({ metrics: data ?? {} })
    }

    return NextResponse.json({ results: [] })
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e?.message }, { status: 200 })
  }
}
