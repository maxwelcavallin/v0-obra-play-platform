"use client"

import { useState } from "react"
import useSWR from "swr"
import { Download, X, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import { ReadonlyBadge, Badge, fmtBRL } from "@/components/admin/readonly-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type FornecedorAuditoria = {
  company_id: number; name: string; cnpj: string | null
  received: number; answered: number
  ocs_total: number
  volume_total_micros: number
  cotacoes: { identifier: string; cotacao_id: string; answered_at: string | null; total_micros: number | null }[]
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const ANOS = [2024, 2025, 2026]

export default function AuditoriaCredenciadosPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [busca, setBusca] = useState("")
  const [drawer, setDrawer] = useState<FornecedorAuditoria | null>(null)
  const [expandedCotacao, setExpandedCotacao] = useState<string | null>(null)

  const { sortKey, sortDir, toggle } = useSortable()

  const { data, isLoading } = useSWR(
    `/api/admin/obraplay/auditoria?mes=${mes}&ano=${ano}&q=${encodeURIComponent(busca)}${sortKey ? `&sort=${sortKey}&dir=${sortDir}` : ""}`,
    fetcher
  )

  const rows: FornecedorAuditoria[] = data?.rows ?? []

  const COLS: ColDef[] = [
    { label: "Fornecedor",   key: "name" },
    { label: "Recebidas",    key: "received",             numeric: true },
    { label: "Respondidas",  key: "answered",             numeric: true },
    { label: "Taxa %",       key: "answered",             numeric: true },
    { label: "OCs",          key: "ocs_total",            numeric: true },
    { label: "Vol. Total",   key: "volume_total_micros",  numeric: true },
    { label: "Ticket Médio", key: "volume_total_micros",  numeric: true },
  ]

  function handleSort(key: string) { toggle(key) }

  function exportCSV() {
    const header = "Período,Fornecedor,CNPJ,Cotações Recebidas,Respondidas,Taxa%,OCs,Volume Total,Ticket Médio"
    const csvRows = rows.map(f => {
      const taxa = f.received > 0 ? ((f.answered / f.received) * 100).toFixed(1) : "0"
      const ticket = f.ocs_total > 0 ? fmtBRL(f.volume_total_micros / f.ocs_total / 1_000_000) : "—"
      return [
        `${MESES[mes - 1]}/${ano}`, f.name, f.cnpj ?? "",
        f.received, f.answered, taxa, f.ocs_total,
        fmtBRL(f.volume_total_micros / 1_000_000), ticket,
      ].join(",")
    })
    const csv = [header, ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `auditoria-${MESES[mes - 1]}-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Auditoria de Credenciados</h1>
            <p className="text-sm text-gray-400">Fornecedores com CNPJ verificado — fechamento mensal</p>
          </div>
          <ReadonlyBadge />
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D1B3E] text-white text-sm rounded-lg hover:bg-[#1565C0] transition-colors">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Competência:</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1565C0]">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1565C0]">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar fornecedor ou CNPJ..."
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1565C0] w-52" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {COLS.map(col => <SortableTh key={col.label + col.key} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={handleSort} />)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum dado para o período selecionado.</td></tr>
            )}
            {rows.map(f => {
              const taxa = f.received > 0 ? ((f.answered / f.received) * 100).toFixed(1) : "0"
              const ticket = f.ocs_total > 0 ? fmtBRL(f.volume_total_micros / f.ocs_total / 1_000_000) : "—"
              return (
                <tr key={f.company_id} onClick={() => setDrawer(f)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900 text-xs">{f.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.cnpj ?? "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{f.received}</td>
                  <td className="px-3 py-3 text-gray-700">{f.answered}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={11} className="text-green-500" />
                      <span className="text-green-700 font-medium">{taxa}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-700">{f.ocs_total}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 text-xs">{fmtBRL(f.volume_total_micros / 1_000_000)}</td>
                  <td className="px-3 py-3 text-gray-700 text-xs">{ticket}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{rows.length} fornecedor{rows.length !== 1 ? "es" : ""} — {MESES[mes - 1]}/{ano}</p>
        </div>
      </div>

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawer(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{drawer.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{drawer.cnpj ?? "—"} · {MESES[mes - 1]}/{ano}</p>
              </div>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5 border-b border-gray-100">
              {[
                ["Recebidas", drawer.received],
                ["Respondidas", drawer.answered],
                ["Taxa", `${drawer.received > 0 ? ((drawer.answered / drawer.received) * 100).toFixed(1) : 0}%`],
                ["OCs", drawer.ocs_total],
                ["Volume Total", fmtBRL(drawer.volume_total_micros / 1_000_000)],
                ["Ticket Médio", drawer.ocs_total > 0 ? fmtBRL(drawer.volume_total_micros / drawer.ocs_total / 1_000_000) : "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cotações respondidas no período</h3>
              {drawer.cotacoes.length === 0 && (
                <p className="text-sm text-gray-400">Nenhuma cotação no período.</p>
              )}
              <div className="space-y-2">
                {drawer.cotacoes.map(c => (
                  <div key={c.cotacao_id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCotacao(expandedCotacao === c.cotacao_id ? null : c.cotacao_id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-900">{c.identifier}</span>
                        {c.answered_at && <Badge color="green">Respondida</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {c.total_micros != null ? fmtBRL(c.total_micros / 1_000_000) : "—"}
                        </span>
                        {expandedCotacao === c.cotacao_id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
