import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSession } from "@/lib/session"

const db = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const items = await db`
    SELECT sc.id, sc.quantity, sc.updated_at,
           si.id AS item_id, si.name, si.unit, si.image_url,
           si.min_price_micros, si.max_price_micros, si.avg_price_micros,
           cat.name AS category_name
    FROM showcase_cart sc
    JOIN showcase_items si ON si.id = sc.item_id
    LEFT JOIN showcase_categories cat ON cat.id = si.category_id
    WHERE sc.user_id = ${session.userId}
    ORDER BY sc.updated_at DESC
  `

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { item_id, quantity } = await req.json()
  if (!item_id || !quantity || quantity <= 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  await db`
    INSERT INTO showcase_cart (user_id, item_id, quantity)
    VALUES (${session.userId}, ${item_id}, ${quantity})
    ON CONFLICT (user_id, item_id) DO UPDATE
      SET quantity = EXCLUDED.quantity, updated_at = NOW()
  `

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { item_id } = await req.json()

  await db`
    DELETE FROM showcase_cart
    WHERE user_id = ${session.userId} AND item_id = ${item_id}
  `

  return NextResponse.json({ ok: true })
}
