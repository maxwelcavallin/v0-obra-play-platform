import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdminApi } from "@/app/admin/middleware-check"

const db = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const adminCheck = await requirePlatformAdminApi(req)
  if (adminCheck) return adminCheck

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const category = searchParams.get("category") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const per = 50
  const offset = (page - 1) * per

  const items = await db`
    SELECT si.id, si.name, si.slug, si.unit, si.description, si.image_url,
           si.min_price_micros, si.max_price_micros, si.avg_price_micros,
           si.is_active, si.last_synced_at, si.created_at,
           sc.name AS category_name, sc.id AS category_id
    FROM showcase_items si
    LEFT JOIN showcase_categories sc ON sc.id = si.category_id
    WHERE (${search} = '' OR si.name ILIKE ${'%' + search + '%'})
      AND (${category} = '' OR sc.slug = ${category})
    ORDER BY si.name
    LIMIT ${per} OFFSET ${offset}
  `

  const [{ total }] = await db`
    SELECT COUNT(*) AS total FROM showcase_items si
    LEFT JOIN showcase_categories sc ON sc.id = si.category_id
    WHERE (${search} = '' OR si.name ILIKE ${'%' + search + '%'})
      AND (${category} = '' OR sc.slug = ${category})
  `

  return NextResponse.json({ items, total: Number(total), page, per })
}

export async function PATCH(req: NextRequest) {
  const adminCheck = await requirePlatformAdminApi(req)
  if (adminCheck) return adminCheck

  const body = await req.json()
  const { id, is_active, name, description, image_url } = body

  await db`
    UPDATE showcase_items SET
      is_active   = COALESCE(${is_active ?? null}, is_active),
      name        = COALESCE(${name ?? null}, name),
      description = COALESCE(${description ?? null}, description),
      image_url   = COALESCE(${image_url ?? null}, image_url),
      updated_at  = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
