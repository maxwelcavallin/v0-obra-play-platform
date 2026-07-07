"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, RefreshCw, ExternalLink, Copy } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Cotacao = {
  op_id: number
  local_id: string | null
  code: string
  name: string
  status: string
  company_name: string
  company_city: string | null
  company_state: string | null
  creator_name: string
  created_at: string | null
  expires_at: string | null
  requirement_date: string | null
  canceled_at: string | null
  items_count: number
  answers_count: number
  obra_name: string | null
  identifier: string | null
}

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray" | "red"> = {
  open:      "orange",
  answered:  "green",
  closed:    "blue",
  canceled:  "red",
  draft:     "gray",
  // português (fallback local)
  "Respondida":           "green",
  "Enviada":              "blue",
  "Aguardando respostas": "orange",
  "Rascunho":             "gray",
  "Cancelada":            "red",
}

const STATUS_LABEL: Record<string, string> = {
  open:     "Aberta",
  answered: "Respondida",
  closed:   "Fechada",
  canceled: "Cancelada",
  draft:    "Rascunho",
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
    <button
      onClick={() => navigator.clipboard.writeText(value)}
      title="Copiar"
      className="ml-1 text-gray-300 hover:text-gray-600 transition-colors"
    >
      <Copy size={10} />
    </button>
  )
}

export default function CotacoesObraPlayPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [days, setDays] = useState("15")
  const [page, setPage] = useState(1)

  const { sortKey, sortDir, toggle } = useSortable()

  const swrKey = `/api/admin/obraplay/cotacoes?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&days=${days}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`
  const { data, isLoading, isValidating, mutate } = useSWR(swrKey, fetcher)

  const rows: Cotacao[]        = data?.rows ?? []
  const total: number          = data?.total ?? 0
  const syncing                = isValidating && !isLoading
  const warning: string | null = data?._warning ?? null
  const apiError: string | null = data?.error ?? null

  const COLS: ColDef[] = [
    { label: "Código",      key: "code" },
    { label: "Nome",        key: "name" },
    { label: "Solicitante", key: "company_name" },
    { label: "Criador",     key: "creator_name" },
    { label: "Itens",       key: "items_count",  numeric: true },
    { label: "Respostas",   key: "answers_count", numeric: true },
    { label: "Criação",     key: "created_at" },
    { label: "Validade",    key: "expires_at" },
    { label: "Necessidade", key: "requirement_date" },
    { label: "Status",      key: "status" },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cotações</h1>
            <p className="text-sm text-gray-400">API ObraPlay em tempo real</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={days} onChange={e => { setDays(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white font-medium text-gray-700">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white">
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="open">Aberta</option>
            <option value="answered">Respondida</option>
            <option value="closed">Fechada</option>
            <option value="canceled">Cancelada</option>
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch() }}
              placeholder="Código, nome ou empresa..."
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
                  Nenhuma cotação encontrada{days !== "todos" ? ` nos últimos ${days} dias` : ""}.
                </td>
              </tr>
            )}
            {rows.map(c => (
              <tr key={c.op_id} className={`hover:bg-gray-50 transition-colors ${c.canceled_at ? "opacity-60" : ""}`}>
                {/* Código */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-mono font-semibold text-gray-900 text-xs">{c.code}</span>
                  <CopyBtn value={c.code} />
                  {c.identifier && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.identifier}</p>
                  )}
                </td>
                {/* Nome */}
                <td className="px-3 py-2 max-w-[180px]">
                  <p className="text-xs text-gray-800 truncate" title={c.name}>{c.name}</p>
                  {c.obra_name && <p className="text-[10px] text-gray-400 truncate">{c.obra_name}</p>}
                </td>
                {/* Solicitante */}
                <td className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{c.company_name}</p>
                  {(c.company_city || c.company_state) && (
                    <p className="text-[10px] text-gray-400">{[c.company_city, c.company_state].filter(Boolean).join(" / ")}</p>
                  )}
                </td>
                {/* Criador */}
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{c.creator_name}</td>
                {/* Itens */}
                <td className="px-3 py-2 text-center text-gray-700 text-xs font-medium">{c.items_count}</td>
                {/* Respostas */}
                <td className="px-3 py-2 text-center text-gray-700 text-xs font-medium">{c.answers_count}</td>
                {/* Criação */}
                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDateTime(c.created_at)}</td>
                {/* Validade */}
                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(c.expires_at)}</td>
                {/* Necessidade */}
                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(c.requirement_date)}</td>
                {/* Status */}
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <Badge color={STATUS_COLOR[c.status] ?? "gray"}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                    {c.canceled_at && (
                      <Badge color="red">Cancelada {fmtDate(c.canceled_at)}</Badge>
                    )}
                  </div>
                </td>
                {/* Detalhe */}
                <td className="px-3 py-2">
                  <Link
                    href={c.local_id ? `/admin/obraplay/cotacoes/${c.local_id}` : `/admin/obraplay/cotacoes/op-${c.op_id}`}
                    className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap"
                  >
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {total} cotaç{total !== 1 ? "ões" : "ão"}
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
