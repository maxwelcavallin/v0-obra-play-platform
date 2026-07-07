"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Cotacao = {
  id: string; identifier: string; status: string; need_date: string | null
  created_at: string; obraplay_quotation_id: number | null
  company_name: string; obra_name: string | null
  item_count: number; supplier_count: number; response_count: number
}

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray" | "red"> = {
  "Respondida": "green",
  "Enviada": "blue",
  "Aguardando respostas": "orange",
  "Rascunho": "gray",
  "Cancelada": "red",
}

export default function CotacoesMarketplacePage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const { sortKey, sortDir, toggle } = useSortable()

  const { data, isLoading } = useSWR(
    `/api/admin/obraplay/cotacoes?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`,
    fetcher
  )

  const rows: Cotacao[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  const COLS: ColDef[] = [
    { label: "Código",       key: "identifier" },
    { label: "Empresa",      key: "company_name" },
    { label: "Obra",         key: "obra_name" },
    { label: "Itens",        key: "item_count",      numeric: true },
    { label: "Fornecedores", key: "supplier_count",  numeric: true },
    { label: "Respostas",    key: "response_count",  numeric: true },
    { label: "Necessidade",  key: "need_date" },
    { label: "Status",       key: "status" },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cotações</h1>
            <p className="text-sm text-gray-400">Banco de dados local — Constructor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white">
            <option value="">Todos os status</option>
            <option value="Rascunho">Rascunho</option>
            <option value="Aguardando respostas">Aguardando respostas</option>
            <option value="Respondida">Respondida</option>
            <option value="Enviada">Enviada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Código ou empresa..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-72 outline-none focus:border-[#1565C0]" />
          </div>
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
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma cotação encontrada.</td></tr>
            )}
            {rows.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-gray-900 text-xs">{c.identifier}</span>
                  {c.obraplay_quotation_id && (
                    <p className="text-[10px] text-gray-400 mt-0.5">OP #{c.obraplay_quotation_id}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.company_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{c.obra_name ?? "—"}</td>
                <td className="px-4 py-3 text-center text-gray-700">{c.item_count}</td>
                <td className="px-4 py-3 text-center text-gray-700">{c.supplier_count}</td>
                <td className="px-4 py-3 text-center text-gray-700">{c.response_count}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.need_date ? fmtDate(c.need_date) : "—"}</td>
                <td className="px-4 py-3">
                  <Badge color={STATUS_COLOR[c.status] ?? "gray"}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/cotacoes/${c.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} cotaç{total !== 1 ? "ões" : "ão"}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400">Anterior</button>
            <span className="text-xs text-gray-500">Página {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={rows.length < 50}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  )
}
