"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, RefreshCw, ExternalLink, Copy, ChevronDown, ChevronRight } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Resposta = {
  op_answer_id: number
  quotation_id: number | null
  quotation_code: string | null
  cotacao_id: string | null
  cotacao_identifier: string | null
  // solicitante (construtor)
  company_name: string
  requester_name: string | null
  requester_email: string | null
  requester_phone: string | null
  obra_name: string | null
  items_from_quotation: number | null
  // fornecedor
  supplier_name: string
  supplier_city: string | null
  supplier_email: string | null
  supplier_foreign_id: number | null
  // condições
  payment_method: string | null
  answered_at: string | null
  arrival_estimate: string | null
  valid_until: string | null
  status: "Respondida" | "Em aberto"
  item_count: number
  observations: string | null
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

// Linha expandível com dados do solicitante
function RespostaRow({ r, colCount }: { r: Resposta; colCount: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Status */}
        <td className="px-3 py-2 whitespace-nowrap">
          <Badge color={r.status === "Respondida" ? "green" : "orange"}>{r.status}</Badge>
        </td>
        {/* Resp. # */}
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="font-mono text-xs text-gray-700">#{r.op_answer_id}</span>
          <CopyBtn value={String(r.op_answer_id)} />
        </td>
        {/* Fornecedor */}
        <td className="px-3 py-2">
          <p className="font-medium text-gray-900 text-xs whitespace-nowrap">{r.supplier_name}</p>
          {r.supplier_email && <p className="text-[10px] text-gray-400">{r.supplier_email}</p>}
          {r.supplier_city  && <p className="text-[10px] text-gray-400">{r.supplier_city}</p>}
        </td>
        {/* Empresa (construtor) */}
        <td className="px-3 py-2">
          <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{r.company_name}</p>
          {r.requester_name && <p className="text-[10px] text-gray-400">{r.requester_name}</p>}
        </td>
        {/* Cotação vinculada */}
        <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          {r.cotacao_id ? (
            <Link href={`/admin/obraplay/cotacoes/${r.cotacao_id}`}
              className="font-mono text-xs text-[#1565C0] hover:underline">
              {r.cotacao_identifier ?? `OP #${r.quotation_id}`}
            </Link>
          ) : (
            <span className="font-mono text-xs text-gray-500">
              {r.cotacao_identifier ?? (r.quotation_id ? `OP #${r.quotation_id}` : "—")}
            </span>
          )}
        </td>
        {/* Data resposta */}
        <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDateTime(r.answered_at)}</td>
        {/* Validade */}
        <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(r.valid_until)}</td>
        {/* Previsão entrega */}
        <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(r.arrival_estimate)}</td>
        {/* Pagamento */}
        <td className="px-3 py-2">
          {r.payment_method
            ? <Badge color="gray">{r.payment_method}</Badge>
            : <span className="text-gray-300 text-xs">—</span>}
        </td>
        {/* Itens */}
        <td className="px-3 py-2 text-center text-xs font-medium text-gray-700">{r.item_count}</td>
        {/* Expandir / Ver */}
        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(v => !v)}
              className="text-gray-400 hover:text-gray-700 transition-colors" title="Detalhes do solicitante">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <Link href={`/admin/obraplay/respostas/${r.op_answer_id}`}
              className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
              Ver <ExternalLink size={11} />
            </Link>
          </div>
        </td>
      </tr>

      {/* Linha expandida: dados do solicitante */}
      {expanded && (
        <tr className="bg-blue-50/40 border-b border-blue-100">
          <td colSpan={colCount} className="px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Empresa construtora</p>
                <p className="font-semibold text-gray-800">{r.company_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Solicitante</p>
                <p className="text-gray-700">{r.requester_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">E-mail</p>
                <p className="text-gray-700 break-all">{r.requester_email ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Telefone</p>
                <p className="text-gray-700">{r.requester_phone ?? "—"}</p>
              </div>
              {r.obra_name && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Obra</p>
                  <p className="text-gray-700">{r.obra_name}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Itens na cotação</p>
                <p className="text-gray-700">{r.items_from_quotation ?? r.item_count}</p>
              </div>
              {r.observations && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Observações da resposta</p>
                  <p className="text-gray-700">{r.observations}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RespostasCotacaoPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [days, setDays] = useState("15")
  const [page, setPage] = useState(1)

  const { sortKey, sortDir, toggle } = useSortable()

  const swrKey = `/api/admin/obraplay/respostas?q=${encodeURIComponent(query)}&days=${days}&status=${status}&page=${page}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`
  const { data, isLoading, isValidating, mutate } = useSWR(swrKey, fetcher)

  const rows: Resposta[]        = data?.rows ?? []
  const total: number           = data?.total ?? 0
  const syncing                 = isValidating && !isLoading
  const warning: string | null  = data?._warning ?? null
  const apiError: string | null = data?.error ?? null

  // Filtra status client-side (a API não suporta esse filtro nativamente)
  const filteredRows = status
    ? rows.filter(r => r.status === status)
    : rows

  const COLS: ColDef[] = [
    { label: "Status",        key: "status" },
    { label: "Resp. #",       key: "op_answer_id", numeric: true },
    { label: "Fornecedor",    key: "supplier_name" },
    { label: "Empresa",       key: "company_name" },
    { label: "Cotação",       key: "cotacao_identifier" },
    { label: "Data resposta", key: "answered_at" },
    { label: "Validade",      key: "valid_until" },
    { label: "Prev. entrega", key: "arrival_estimate" },
    { label: "Pagamento",     key: "payment_method" },
    { label: "Itens",         key: "item_count", numeric: true },
    { label: "" },
  ]

  function handleSort(key: string) { toggle(key); setPage(1) }
  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Respostas de Cotação</h1>
            <p className="text-sm text-gray-400">API ObraPlay em tempo real · clique na linha para ver solicitante</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Período */}
          <select value={days} onChange={e => { setDays(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white font-medium text-gray-700">
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Status */}
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white">
            <option value="">Todos os status</option>
            <option value="Respondida">Respondida</option>
            <option value="Em aberto">Em aberto</option>
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
            {!isLoading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma resposta encontrada{days !== "todos" ? ` nos últimos ${days} dias` : ""}.
                </td>
              </tr>
            )}
            {filteredRows.map(r => (
              <RespostaRow key={`${r.op_answer_id}-${r.quotation_id}`} r={r} colCount={COLS.length} />
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {total} resposta{total !== 1 ? "s" : ""}
            {status && <span className="ml-1">· {status.toLowerCase()}</span>}
            {days !== "todos" && <span className="ml-1 text-gray-300">· últimos {days} dias</span>}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400">
              Anterior
            </button>
            <span className="text-xs text-gray-500">Página {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={rows.length < 50}
              className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:border-gray-400">
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
