"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Resposta = {
  op_answer_id: number; cotacao_id: string; cotacao_identifier: string
  supplier_name: string; supplier_city: string | null
  answered_at: string | null; payment_method: string | null
  item_count: number; cotacao_fornecedor_id: string | null
}

export default function RespostasCotacaoPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSWR(
    `/api/admin/obraplay/respostas?q=${encodeURIComponent(query)}&page=${page}`,
    fetcher
  )

  const rows: Resposta[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  const COLS: ColDef[] = [
    { label: "Fornecedor",    key: "supplier_name" },
    { label: "Cidade",        key: "supplier_city" },
    { label: "Cotação",       key: "cotacao_identifier" },
    { label: "Data resposta", key: "answered_at" },
    { label: "Pagamento",     key: "payment_method" },
    { label: "Itens",         key: "item_count", numeric: true },
  ]
  const { sorted, sortKey, sortDir, toggle } = useSortable(rows as Record<string, unknown>[])

  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Respostas de Cotação</h1>
            <p className="text-sm text-gray-400">Banco de dados local — Constructor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Fornecedor ou código de cotação..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {COLS.map(col => <SortableTh key={col.label} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma resposta encontrada.</td></tr>
            )}
            {(sorted as unknown as Resposta[]).map(r => (
              <tr key={`${r.op_answer_id}-${r.cotacao_id}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{r.supplier_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.supplier_city ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/cotacoes/${r.cotacao_id}`} className="font-mono text-xs text-[#1565C0] hover:underline">{r.cotacao_identifier}</Link>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.answered_at ? fmtDate(r.answered_at) : "—"}</td>
                <td className="px-4 py-3">
                  {r.payment_method ? <Badge color="gray">{r.payment_method}</Badge> : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-700">{r.item_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} resposta{total !== 1 ? "s" : ""}</p>
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
