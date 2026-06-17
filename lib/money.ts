/**
 * Utilitário de máscara monetária BRL
 * Centraliza formatação e parsing de valores monetários em toda a plataforma.
 */

/**
 * Converte um número para string no formato BRL: "1.234,56"
 * Sem o prefixo "R$" — use fmtBRL para exibição completa.
 */
export function formatMoneyInput(value: number): string {
  return (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formata número para exibição completa com símbolo: "R$ 1.234,56"
 */
export function fmtBRL(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  if (isNaN(n)) return "R$ 0,00"
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/**
 * Aplica máscara monetária a uma string digitada pelo usuário.
 * Remove tudo que não for dígito, interpreta como centavos e formata.
 * Ex: "1234" → "12,34" | "123456" → "1.234,56"
 */
export function applyMoneyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  const cents = parseInt(digits, 10)
  return formatMoneyInput(cents)
}

/**
 * Converte string mascarada ("1.234,56") para número em reais (1234.56).
 * Retorna 0 se inválido.
 */
export function parseBRL(masked: string): number {
  if (!masked) return 0
  // Remove pontos de milhar, troca vírgula por ponto
  const normalized = masked.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}

/**
 * Converte string mascarada para inteiro de centavos.
 * Ex: "1.234,56" → 123456
 */
export function parseBRLCents(masked: string): number {
  return Math.round(parseBRL(masked) * 100)
}
