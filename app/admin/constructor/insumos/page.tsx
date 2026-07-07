"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, Package } from "lucide-react"
import { fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ConstructorInsumosPage() {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const { sortKey, sortDir, toggle } = useSortable()

  const { data, isLoading } = useSWR(
    `/api/admin/constructor/insumos?q=${encodeURIComponent(q)}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`,
    fetcher
  )
  const items: Record<string, unknown>[] = data?.insumos ?? []
  const total: number = data?.total ?? 0
  const per: number = data?.per ?? 100

  const COLS: ColDef[] = [
    { label: "Nome",           key: "name" },
    { label: "Categoria",      key: "category" },
    { label: "Unidade",        key: "unit" },
    { label: "Código interno", key: "internal_code" },
    { label: "Empresa",        key: "company_name" },
    { label: "Criado em",      key: "created_at" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Insumos Padrão</h1>
          <p className="text-sm text-gray-400">Catálogo global de insumos cadastrados pelas empresas</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Nome, categoria ou unidade..."
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Package size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Nenhum insumo encontrado.</p>
                </td>
              </tr>
            ) : items.map((i) => (
              <tr key={String(i.id)} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 text-sm">{String(i.name ?? "—")}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{String(i.category ?? "—")}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{String(i.unit ?? "—")}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{String(i.internal_code ?? "—")}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(i.company_name ?? "Global")}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(String(i.created_at ?? ""))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} insumo{total !== 1 ? "s" : ""}</p>
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
