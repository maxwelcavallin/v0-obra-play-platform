import { NextRequest, NextResponse } from "next/server"

/**
 * Regra de negócio R1 — ONBOARDING OBRIGATÓRIO
 *
 * O middleware protege todas as rotas /dashboard/*.
 * - Sem sessão (cookie op_session_token ausente) → redireciona para /login.
 * - Com sessão mas sem empresa (cookie op_no_company=1 setado pelo login) →
 *   redireciona para /dashboard/onboarding, exceto se já estiver lá.
 *
 * O cookie op_no_company é setado pela API de login quando o usuário ainda não
 * tem empresa, e removido pelo completeOnboarding / setActiveCompany no cliente.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Verifica presença de sessão
  const sessionToken = req.cookies.get("op_session_token")?.value
  if (!sessionToken) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // 2. Se está no onboarding, deixa passar sempre
  if (pathname === "/dashboard/onboarding") {
    return NextResponse.next()
  }

  // 3. Verifica se o usuário ainda não tem empresa
  const noCompany = req.cookies.get("op_no_company")?.value === "1"
  if (noCompany) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard/onboarding"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
