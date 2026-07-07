import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, image_url, link_url, title, sort_order
      FROM home_banners
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at ASC
      LIMIT 5
    `
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error("[api/banners]", err)
    return NextResponse.json([], { status: 200 })
  }
}
