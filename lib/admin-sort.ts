/**
 * Utilitário de ordenação server-side para as APIs do painel admin.
 * Cada endpoint declara as colunas permitidas (allowlist) para prevenir SQL injection.
 * Retorna a cláusula ORDER BY como string segura (nunca interpola input do usuário diretamente).
 */

export type SortDir = "asc" | "desc"

export interface SortConfig {
  /** Mapa: chave frontend → expressão SQL segura */
  columns: Record<string, string>
  /** Cláusula ORDER BY padrão quando nenhum sort é solicitado */
  defaultOrder: string
}

/**
 * Retorna a cláusula ORDER BY completa para usar em template literal do Neon.
 * Como o Neon não permite parâmetros em ORDER BY, usamos string interpolação — mas
 * a segurança é garantida pela allowlist: só expressões declaradas em `config.columns`
 * podem ser retornadas.
 */
export function buildOrderBy(
  sortParam: string | null,
  dirParam: string | null,
  config: SortConfig
): string {
  const dir: SortDir = dirParam === "asc" ? "asc" : "desc"
  if (!sortParam || !config.columns[sortParam]) {
    return config.defaultOrder
  }
  const col = config.columns[sortParam]
  return `${col} ${dir.toUpperCase()} NULLS LAST`
}
