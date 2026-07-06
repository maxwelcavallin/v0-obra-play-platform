import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"

const db = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search   = searchParams.get("search") ?? ""
  const category = searchParams.get("category") ?? ""
  const page     = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const per      = 24
  const offset   = (page - 1) * per

  const items = await db`
    SELECT si.id, si.name, si.slug, si.unit, si.description, si.image_url,
           si.min_price_micros, si.max_price_micros, si.avg_price_micros,
           sc.name AS category_name, sc.slug AS category_slug
    FROM showcase_items si
    LEFT JOIN showcase_categories sc ON sc.id = si.category_id
    WHERE si.is_active = true
      AND (${search} = '' OR si.name ILIKE ${'%' + search + '%'})
      AND (${category} = '' OR sc.slug = ${category})
    ORDER BY si.name
    LIMIT ${per} OFFSET ${offset}
  `

  const [{ total }] = await db`
    SELECT COUNT(*) AS total FROM showcase_items si
    LEFT JOIN showcase_categories sc ON sc.id = si.category_id
    WHERE si.is_active = true
      AND (${search} = '' OR si.name ILIKE ${'%' + search + '%'})
      AND (${category} = '' OR sc.slug = ${category})
  `

  const categories = await db`
    SELECT sc.id, sc.name, sc.slug, COUNT(si.id)::int AS count
    FROM showcase_categories sc
    LEFT JOIN showcase_items si ON si.category_id = sc.id AND si.is_active = true
    GROUP BY sc.id, sc.name, sc.slug, sc.sort_order
    HAVING COUNT(si.id) > 0
    ORDER BY sc.sort_order, sc.name
  `

  return NextResponse.json({ items, categories, total: Number(total), page, per })
}
