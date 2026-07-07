"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, ExternalLink } from "lucide-react"
import { Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray"> = {
  "Rascunho": "gray",
  "Enviada": "blue",
  "Respondida": "green",
  "Expirada": "gray",
  "Cancelada": "gray",
}

export default function ConstructorCotacoesPage() {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const { sortKey, sortDir, toggle } = useSortable()

  const { data, isLoading } = useSWR(
    `/api/admin/constructor/cotacoes?q=${encodeURIComponent(q)}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`,
    fetcher
  )
  const items: Record<string, unknown>[] = data?.cotacoes ?? []
  const total: number = data?.total ?? 0
  const per: number = data?.per ?? 50

  const COLS: ColDef[] = [
    { label: "Identificador", key: "identifier" },
    { label: "Empresa",       key: "company_name" },
    { label: "Obra",          key: "obra_name" },
    { label: "Status",        key: "status" },
    { label: "Itens",         key: "item_count", numeric: true },
    { label: "Necessidade",   key: "need_date" },
    { label: "Criada em",     key: "created_at" },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cotações</h1>
          <p className="text-sm text-gray-400">Todas as cotações das empresas construtoras</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Identificador ou empresa..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {COLS.map(col => <SortableTh key={col.label} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={handleSort} />)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma cotação encontrada.</td></tr>
            ) : items.map((c) => (
              <tr key={String(c.id)} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{String(c.identifier ?? "—")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/empresas/${c.company_id}`} className="font-medium text-[#1565C0] hover:underline text-sm">
                    {String(c.company_name ?? "—")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(c.obra_name ?? "—")}</td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[String(c.status)] ?? "gray"}>{String(c.status ?? "—")}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(c.item_count ?? 0)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(String(c.need_date ?? ""))}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(String(c.created_at ?? ""))}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/cotacoes/${c.id}`} target="_blank" className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} cotaç{total !== 1 ? "ões" : "ão"}</p>
          {total > per && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40">Anterior</button>
              <span className="text-xs text-gray-500">Página {page} / {Math.ceil(total / per)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={items.length < per}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40">Próxima</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
