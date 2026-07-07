"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

export type SortDir = "asc" | "desc" | null

export interface ColDef {
  label: string
  key?: string        // campo do objeto; omitir em colunas não-sortáveis (ações, etc.)
  numeric?: boolean   // true → ordena como número
}

export function useSortable<T extends Record<string, unknown>>(rows: T[]) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  function toggle(key: string) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir("asc")
    } else if (sortDir === "asc") {
      setSortDir("desc")
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      const an = Number(av)
      const bn = Number(bv)
      const numeric = !Number.isNaN(an) && !Number.isNaN(bn)
      let cmp = numeric
        ? an - bn
        : String(av).localeCompare(String(bv), "pt-BR", { sensitivity: "base" })
      return sortDir === "desc" ? -cmp : cmp
    })
  }, [rows, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggle }
}

interface SortableThProps {
  col: ColDef
  sortKey: string | null
  sortDir: SortDir
  onToggle: (key: string) => void
  className?: string
}

export function SortableTh({ col, sortKey, sortDir, onToggle, className = "" }: SortableThProps) {
  if (!col.key) {
    return (
      <th className={`text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 ${className}`}>
        {col.label}
      </th>
    )
  }

  const active = sortKey === col.key
  return (
    <th
      className={`text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3 cursor-pointer select-none whitespace-nowrap group ${active ? "text-[#1565C0]" : "text-gray-400 hover:text-gray-600"} ${className}`}
      onClick={() => onToggle(col.key!)}
    >
      <span className="inline-flex items-center gap-1">
        {col.label}
        {active && sortDir === "asc"  && <ChevronUp  size={12} className="text-[#1565C0]" />}
        {active && sortDir === "desc" && <ChevronDown size={12} className="text-[#1565C0]" />}
        {!active && <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
      </span>
    </th>
  )
}
