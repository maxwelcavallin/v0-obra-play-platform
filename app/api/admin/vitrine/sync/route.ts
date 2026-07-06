import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requirePlatformAdmin } from "@/app/admin/middleware-check"

const db = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const adminCheck = await requirePlatformAdmin(req)
  if (adminCheck) return adminCheck

  const opUrl = process.env.OBRAPLAY_API_URL!
  const opToken = process.env.OBRAPLAY_API_TOKEN!

  let page = 1
  let totalSynced = 0
  let hasMore = true

  try {
    while (hasMore) {
      const res = await fetch(`${opUrl}/api/price-showcase/items/?page=${page}&per_page=100`, {
        headers: { Authorization: `Token ${opToken}` },
      })
      if (!res.ok) break

      const data = await res.json()
      const items: {
        id: number
        name: string
        unit: string
        description?: string
        category?: { name: string }
        min_price_micros?: number
        max_price_micros?: number
        avg_price_micros?: number
        image?: string
      }[] = data.results ?? data ?? []
      if (!items.length) break

      for (const item of items) {
        // Garante categoria
        let categoryId: string | null = null
        if (item.category?.name) {
          const slug = item.category.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
          const [cat] = await db`
            INSERT INTO showcase_categories (name, slug)
            VALUES (${item.category.name}, ${slug})
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
          `
          categoryId = cat.id
        }

        const slug = `${item.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${item.id}`

        await db`
          INSERT INTO showcase_items
            (op_item_id, name, slug, unit, description, image_url,
             category_id, min_price_micros, max_price_micros, avg_price_micros,
             last_synced_at, updated_at)
          VALUES (
            ${item.id}, ${item.name}, ${slug}, ${item.unit},
            ${item.description ?? null}, ${item.image ?? null},
            ${categoryId}, ${item.min_price_micros ?? null},
            ${item.max_price_micros ?? null}, ${item.avg_price_micros ?? null},
            NOW(), NOW()
          )
          ON CONFLICT (op_item_id) DO UPDATE SET
            name = EXCLUDED.name,
            unit = EXCLUDED.unit,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            category_id = EXCLUDED.category_id,
            min_price_micros = EXCLUDED.min_price_micros,
            max_price_micros = EXCLUDED.max_price_micros,
            avg_price_micros = EXCLUDED.avg_price_micros,
            last_synced_at = NOW(),
            updated_at = NOW()
        `
        totalSynced++
      }

      hasMore = !!data.next
      page++
    }

    await db`
      INSERT INTO sync_control (entity, last_sync_at, total_synced)
      VALUES ('showcase_items', NOW(), ${totalSynced})
      ON CONFLICT (entity) DO UPDATE SET
        last_sync_at = NOW(),
        total_synced = EXCLUDED.total_synced,
        last_error = NULL,
        updated_at = NOW()
    `

    return NextResponse.json({ ok: true, total_synced: totalSynced })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await db`
      INSERT INTO sync_control (entity, last_sync_at, total_synced, last_error)
      VALUES ('showcase_items', NOW(), ${totalSynced}, ${msg})
      ON CONFLICT (entity) DO UPDATE SET
        last_sync_at = NOW(),
        total_synced = EXCLUDED.total_synced,
        last_error = EXCLUDED.last_error,
        updated_at = NOW()
    `
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
