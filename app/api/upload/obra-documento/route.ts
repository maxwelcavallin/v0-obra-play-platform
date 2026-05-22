import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Nenhum arquivo" }, { status: 400 })

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filename = `obras/docs/${Date.now()}-${safeName}`

    const blob = await put(filename, file, { access: "public", contentType: file.type })
    return NextResponse.json({ url: blob.url, size: file.size, name: file.name, ext })
  } catch (err: any) {
    console.error("[upload/obra-documento]", err)
    return NextResponse.json({ error: err.message ?? "Erro no upload" }, { status: 500 })
  }
}
