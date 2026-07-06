import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const [user] = await sql`SELECT is_platform_admin FROM users WHERE id = ${session.user_id}`
  if (!user?.is_platform_admin) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const like = `%${q}%`

  // Usuários Constructor
  const usuarios = await sql`
    SELECT id, name, email, phone
    FROM users
    WHERE (name ILIKE ${like} OR email ILIKE ${like} OR phone ILIKE ${like})
      AND is_active = true
    LIMIT 4
  `

  // Empresas construtoras
  const empresas = await sql`
    SELECT id, fantasy_name, cnpj, city
    FROM companies
    WHERE (fantasy_name ILIKE ${like} OR company_name ILIKE ${like} OR cnpj ILIKE ${like})
    LIMIT 4
  `

  // Cotações Constructor
  const cotacoes = await sql`
    SELECT c.id, c.identifier, co.fantasy_name
    FROM cotacoes c
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.identifier ILIKE ${like}
    LIMIT 4
  `

  // OCs Constructor
  const ocs = await sql`
    SELECT id, identifier, supplier_name
    FROM ordens_compra
    WHERE identifier ILIKE ${like} OR supplier_name ILIKE ${like}
    LIMIT 4
  `

  const results = [
    ...empresas.map((e: { id: string; fantasy_name: string; cnpj: string; city: string }) => ({
      type: "fornecedor",
      label: e.fantasy_name,
      sublabel: `${e.cnpj} · ${e.city ?? ""}`,
      href: `/admin/constructor/empresas/${e.id}`,
    })),
    ...cotacoes.map((c: { id: string; identifier: string; fantasy_name: string }) => ({
      type: "cotacao",
      label: `Cotação ${c.identifier}`,
      sublabel: c.fantasy_name,
      href: `/admin/constructor/cotacoes/${c.id}`,
    })),
    ...ocs.map((o: { id: string; identifier: string; supplier_name: string }) => ({
      type: "oc",
      label: o.identifier,
      sublabel: `Fornecedor: ${o.supplier_name}`,
      href: `/admin/constructor/ordens/${o.id}`,
    })),
    ...usuarios.map((u: { id: string; name: string; email: string }) => ({
      type: "usuario",
      label: u.name,
      sublabel: u.email,
      href: `/admin/constructor/usuarios/${u.id}`,
    })),
  ]

  return NextResponse.json({ results })
}
