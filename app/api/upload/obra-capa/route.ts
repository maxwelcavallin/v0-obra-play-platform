import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"

// Aumenta o limite do body para 20MB para suportar fotos JPG de câmera
export const maxDuration = 30
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    await requireSession()
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Normaliza a extensão — arquivos JPG podem vir como .jpeg
    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const ext = rawExt === "jpeg" ? "jpg" : rawExt
    const filename = `obras/capa-${Date.now()}.${ext}`

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    console.error("[upload/obra-capa]", err)
    return NextResponse.json({ error: err.message ?? "Erro no upload" }, { status: 500 })
  }
}
