"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink, Building2 } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function EmpresasConstutorasPage() {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const { sortKey, sortDir, toggle } = useSortable()

  const { data, isLoading } = useSWR(
    `/api/admin/constructor/empresas?q=${encodeURIComponent(q)}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`,
    fetcher
  )

  const rows = data?.rows ?? []
  const total: number = data?.total ?? 0
  const per: number = data?.per ?? 50
  const totalPages = Math.max(1, Math.ceil(total / per))

  const COLS: ColDef[] = [
    { label: "Empresa",  key: "fantasy_name" },
    { label: "CNPJ",     key: "cnpj" },
    { label: "Cidade/UF",key: "city" },
    { label: "Usuários", key: "user_count",    numeric: true },
    { label: "Cotações", key: "cotacao_count", numeric: true },
    { label: "Cadastro", key: "created_at" },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch(v: string) {
    setQ(v)
    setPage(1)
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Empresas Construtoras</h1>
          <p className="text-sm text-gray-400">{total} empresa{total !== 1 ? "s" : ""} cadastradas</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Nome, CNPJ ou cidade..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]"
          />
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center">
                  <Building2 size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Nenhuma empresa encontrada.</p>
                </td>
              </tr>
            )}
            {rows.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 truncate max-w-[180px]">{e.fantasy_name || e.company_name}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{e.company_name}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{e.cnpj || "—"}</td>
                <td className="px-4 py-3 text-gray-600 text-sm">
                  {e.city && e.state ? `${e.city}, ${e.state}` : e.city || e.state || "—"}
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{Number(e.user_count) || 0}</td>
                <td className="px-4 py-3 text-center text-gray-700">{Number(e.cotacao_count) || 0}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(e.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/empresas/${e.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} empresa{total !== 1 ? "s" : ""}</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40">Anterior</button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40">Próxima</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
