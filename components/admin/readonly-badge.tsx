export function ReadonlyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#E65100] bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 leading-none">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E65100] animate-pulse" />
      Somente leitura
    </span>
  )
}

export function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  const parsed = d instanceof Date ? d : new Date(d)
  if (isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function fmtBRL(micros?: number | null) {
  if (micros == null) return "—"
  return (micros / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function Badge({
  children, color = "gray",
}: {
  children: React.ReactNode
  color?: "green" | "orange" | "blue" | "red" | "gray" | "purple"
}) {
  const styles: Record<string, string> = {
    green:  "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    red:    "bg-red-50 text-red-600 border-red-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-medium border rounded-full px-2 py-0.5 leading-none ${styles[color]}`}>
      {children}
    </span>
  )
}
