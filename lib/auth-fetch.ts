/**
 * Wrapper de fetch que injeta automaticamente o header Authorization
 * com o token armazenado no localStorage.
 * Necessário porque em ambientes de iframe (preview) o cookie HTTP-only
 * pode não ser enviado automaticamente pelo browser.
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("op_token") : null
  const headers = new Headers(init.headers ?? {})
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
