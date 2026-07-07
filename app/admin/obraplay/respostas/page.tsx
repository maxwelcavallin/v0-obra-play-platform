"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, RefreshCw } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Resposta = {
  op_answer_id: number
  cotacao_id: string
  cotacao_identifier: string
  supplier_name: string
  supplier_city: string | null
  supplier_email: string | null
  answered_at: string | null
  payment_method: string | null
  arrival_estimate: string | null
  item_count: number
  company_name: string | null
  cotacao_fornecedor_id: string | null
}

const PERIOD_OPTIONS = [
  { label: "Últimos 15 dias", value: "15" },
  { label: "Últimos 30 dias", value: "30" },
  { label: "Últimos 60 dias", value: "60" },
  { label: "Últimos 90 dias", value: "90" },
  { label: "Todos os registros", value: "todos" },
]

const PAYMENT_LABELS: Record<string, string> = {
  bankslip: "Boleto",
  pix: "PIX",
  credit_card: "Cartão",
  cash: "À vista",
}

export default function RespostasCotacaoPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [days, setDays] = useState("15")
  const [page, setPage] = useState(1)

  const { sortKey, sortDir, toggle } = useSortable()

  const swrKey = `/api/admin/obraplay/respostas?q=${encodeURIComponent(query)}&days=${days}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`
  const { data, isLoading, isValidating, mutate } = useSWR(swrKey, fetcher)

  const rows: Resposta[] = data?.rows ?? []
  const total: number = data?.total ?? 0
  const syncing = isValidating && !isLoading

  const COLS: ColDef[] = [
    { label: "Fornecedor",    key: "supplier_name" },
    { label: "Empresa",       key: "company_name" },
    { label: "Cotação",       key: "cotacao_identifier" },
    { label: "Data resposta", key: "answered_at" },
    { label: "Pagamento",     key: "payment_method" },
    { label: "Itens",         key: "item_count", numeric: true },
    { label: "Previsão",      key: "arrival_estimate" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Respostas de Cotação</h1>
            <p className="text-sm text-gray-400">Banco de dados local — Constructor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Período */}
          <select value={days} onChange={e => { setDays(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white font-medium text-gray-700">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch() }}
              placeholder="Fornecedor, empresa ou cotação..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
          </div>

          {/* Sincronizar */}
          <button
            onClick={() => mutate()}
            disabled={syncing}
            title="Atualizar dados"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#1565C0] hover:text-[#1565C0] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Atualizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {COLS.map(col => (
                <SortableTh key={col.label} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={handleSort} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma resposta encontrada{days !== "todos" ? ` nos últimos ${days} dias` : ""}.
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={`${r.op_answer_id}-${r.cotacao_id}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 text-sm">{r.supplier_name}</p>
                  {r.supplier_email && (
                    <p className="text-xs text-gray-400 mt-0.5">{r.supplier_email}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.company_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/obraplay/cotacoes/${r.cotacao_id}`}
                    className="font-mono text-xs text-[#1565C0] hover:underline"
                  >
                    {r.cotacao_identifier}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {r.answered_at ? fmtDate(r.answered_at) : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.payment_method
                    ? <Badge color="gray">{PAYMENT_LABELS[r.payment_method] ?? r.payment_method}</Badge>
                    : <span className="text-gray-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{r.item_count}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {r.arrival_estimate ? fmtDate(r.arrival_estimate) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {total} resposta{total !== 1 ? "s" : ""}
            {days !== "todos" && <span className="ml-1 text-gray-300">· últimos {days} dias</span>}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-500">Página {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={rows.length < 50}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
