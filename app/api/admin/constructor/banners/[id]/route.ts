import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/app/admin/middleware-check"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// PUT — edita banner
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const { image_url, link_url, title, sort_order, is_active } = await req.json()

  const [row] = await sql`
    UPDATE home_banners SET
      image_url  = COALESCE(${image_url  ?? null}, image_url),
      link_url   = COALESCE(${link_url   ?? null}, link_url),
      title      = COALESCE(${title      ?? null}, title),
      sort_order = COALESCE(${sort_order ?? null}, sort_order),
      is_active  = COALESCE(${is_active  ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(row)
}

// DELETE — remove banner
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  await sql`DELETE FROM home_banners WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
