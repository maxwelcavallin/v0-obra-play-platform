import { NextRequest, NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/app/admin/middleware-check"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — lista todos os banners
export async function GET() {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const rows = await sql`
    SELECT id, image_url, link_url, title, sort_order, is_active, created_at
    FROM home_banners
    ORDER BY sort_order ASC, created_at ASC
  `
  return NextResponse.json(rows)
}

// POST — cria novo banner
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin()
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { image_url, link_url, title, sort_order } = await req.json()

  if (!image_url) {
    return NextResponse.json({ error: "image_url é obrigatório" }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO home_banners (image_url, link_url, title, sort_order, is_active)
    VALUES (${image_url}, ${link_url ?? ""}, ${title ?? null}, ${sort_order ?? 0}, true)
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
