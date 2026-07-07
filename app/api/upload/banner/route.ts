import { put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/app/admin/middleware-check"

export const maxDuration = 30
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase()
  const filename = `banners/banner-${Date.now()}.${ext}`

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  })

  return NextResponse.json({ url: blob.url })
}
