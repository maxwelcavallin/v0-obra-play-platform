import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { SESSION_COOKIE } from "@/lib/session"

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
