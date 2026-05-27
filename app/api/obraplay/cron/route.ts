import { NextRequest, NextResponse } from "next/server"

// Rota chamada pelo cron do Vercel diariamente às 00h01 (UTC)
// Protegida pelo CRON_SECRET para evitar chamadas externas não autorizadas
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const secret     = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Chama a rota de sync internamente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`
    const res = await fetch(`${baseUrl}/api/obraplay/sync`, { method: "POST" })
    const data = await res.json()
    return NextResponse.json({ triggered: true, ...data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
