"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, RefreshCw, ExternalLink, Copy } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRLReal } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Ordem = {
  id: number
  key: string | null
  obraplay_order_code: string | null
  status: string
  supplier_name: string
  supplier_cnpj: string | null
  supplier_email: string | null
  company_name: string
  company_cnpj: string | null
  quotation_answer: number | null
  total: number | null
  payment_method: string | null
  created_at: string | null
  cotacao_identifier: string | null
  obraplay_sync_error: string | null
  local_id: string | null
}

const PERIOD_OPTIONS = [
  { label: "Últimos 15 dias", value: "15" },
  { label: "Últimos 30 dias", value: "30" },
  { label: "Últimos 60 dias", value: "60" },
  { label: "Últimos 90 dias", value: "90" },
  { label: "Todos os registros", value: "todos" },
]

function fmtDateTime(d?: string | null) {
  if (!d) return "—"
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function CopyBtn({ value }: { value: string }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(value)} title="Copiar"
      className="ml-1 text-gray-300 hover:text-gray-600 transition-colors">
      <Copy size={10} />
    </button>
  )
}

export default function OrdensObraPlayPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [syncErr, setSyncErr] = useState("")
  const [days, setDays] = useState("15")
  const [page, setPage] = useState(1)

  const { sortKey, sortDir, toggle } = useSortable()

  const swrKey = `/api/admin/obraplay/ordens?q=${encodeURIComponent(query)}&sync_err=${syncErr}&days=${days}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`
  const { data, isLoading, isValidating, mutate } = useSWR(swrKey, fetcher)

  const rows: Ordem[]          = data?.rows ?? []
  const total: number          = data?.total ?? 0
  const syncing                = isValidating && !isLoading
  const warning: string | null = data?._warning ?? null
  const apiError: string | null = data?.error ?? null

  const COLS: ColDef[] = [
    { label: "Código OP",     key: "obraplay_order_code" },
    { label: "Comprador",     key: "company_name" },
    { label: "Fornecedor",    key: "supplier_name" },
    { label: "Resp. Cotação", key: "quotation_answer", numeric: true },
    { label: "Cotação",       key: "cotacao_identifier" },
    { label: "Pagamento",     key: "payment_method" },
    { label: "Total",         key: "total", numeric: true },
    { label: "Criada",        key: "created_at" },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ordens de Compra</h1>
            <p className="text-sm text-gray-400">API ObraPlay em tempo real</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={days} onChange={e => { setDays(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white font-medium text-gray-700">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={syncErr} onChange={e => { setSyncErr(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white">
            <option value="">Todas as OCs</option>
            <option value="yes">Somente com erro de sync</option>
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch() }}
              placeholder="Código, fornecedor ou empresa..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-56 outline-none focus:border-[#1565C0]" />
          </div>

          <button onClick={() => mutate()} disabled={syncing}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#1565C0] hover:text-[#1565C0] transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Atualizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {apiError && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          Erro ao buscar dados: {apiError}. Tente sincronizar novamente.
        </div>
      )}
      {warning && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          Aviso: {warning}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
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
              <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma ordem encontrada{days !== "todos" ? ` nos últimos ${days} dias` : ""}.
                </td>
              </tr>
            )}
            {rows.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                {/* Código OP */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-mono font-semibold text-gray-900 text-xs">{o.obraplay_order_code ?? `#${o.id}`}</span>
                  <CopyBtn value={o.obraplay_order_code ?? String(o.id)} />
                  {o.key && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-[120px]" title={o.key}>{o.key}</p>
                  )}
                  {o.obraplay_sync_error && (
                    <Badge color="red">Erro sync</Badge>
                  )}
                </td>
                {/* Comprador */}
                <td className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{o.company_name}</p>
                  {o.company_cnpj && <p className="text-[10px] text-gray-400">{o.company_cnpj}</p>}
                </td>
                {/* Fornecedor */}
                <td className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{o.supplier_name}</p>
                  {o.supplier_cnpj && <p className="text-[10px] text-gray-400">{o.supplier_cnpj}</p>}
                  {o.supplier_email && <p className="text-[10px] text-gray-400">{o.supplier_email}</p>}
                </td>
                {/* Resp. cotação */}
                <td className="px-3 py-2 text-center">
                  {o.quotation_answer
                    ? <span className="font-mono text-xs text-gray-600">#{o.quotation_answer}</span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                {/* Cotação local */}
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{o.cotacao_identifier ?? "—"}</td>
                {/* Pagamento */}
                <td className="px-3 py-2">
                  {o.payment_method
                    ? <Badge color="gray">{o.payment_method}</Badge>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                {/* Total */}
                <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">
                  {o.total != null ? fmtBRLReal(o.total) : "—"}
                </td>
                {/* Criada */}
                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDateTime(o.created_at)}</td>
                {/* Ver */}
                <td className="px-3 py-2">
                  <Link href={`/admin/obraplay/ordens/${o.local_id ?? o.id}`}
                    className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {total} ordem{total !== 1 ? "s" : ""}
            {days !== "todos" && <span className="ml-1 text-gray-300">· últimos {days} dias</span>}
          </p>
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
