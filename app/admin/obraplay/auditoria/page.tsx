"use client"

import { useState } from "react"
import { Download, X, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import { ReadonlyBadge, Badge, fmtBRL } from "@/components/admin/readonly-badge"

type Fornecedor = {
  id: string; name: string; cnpj: string
  received: number; answered: number
  ocs_marketplace: number; ocs_proprio: number
  volume_total_micros: number; volume_marketplace_micros: number; volume_proprio_micros: number
  cotacoes: { code: string; date: string; autofilled: boolean; total_micros: number; itens?: { name: string; qtd: number; unit: string; preco_micros: number }[] }[]
}

const MOCK_DATA: Fornecedor[] = [
  {
    id: "1", name: "Depósito Central Materiais", cnpj: "12.345.678/0001-90",
    received: 28, answered: 21, ocs_marketplace: 14, ocs_proprio: 3,
    volume_total_micros: 184720000000, volume_marketplace_micros: 147000000000, volume_proprio_micros: 37720000000,
    cotacoes: [
      { code: "UHUTQJG", date: "20/06/2026", autofilled: false, total_micros: 8200000000, itens: [{ name: "Cimento CP-II 50kg", qtd: 200, unit: "Saca", preco_micros: 37000000 }] },
      { code: "PQLS9A3", date: "10/06/2026", autofilled: true, total_micros: 6500000000 },
    ],
  },
  {
    id: "3", name: "Ferro e Aço Paulista", cnpj: "45.678.901/0001-23",
    received: 15, answered: 9, ocs_marketplace: 6, ocs_proprio: 1,
    volume_total_micros: 98400000000, volume_marketplace_micros: 82000000000, volume_proprio_micros: 16400000000,
    cotacoes: [
      { code: "UHUTQJG", date: "21/06/2026", autofilled: false, total_micros: 9100000000 },
    ],
  },
  {
    id: "5", name: "Material Hidráulico Nordeste", cnpj: "76.543.210/0001-67",
    received: 8, answered: 7, ocs_marketplace: 4, ocs_proprio: 2,
    volume_total_micros: 43500000000, volume_marketplace_micros: 28000000000, volume_proprio_micros: 15500000000,
    cotacoes: [
      { code: "PQLS9A3", date: "11/06/2026", autofilled: true, total_micros: 6750000000 },
    ],
  },
]

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const ANOS = [2025, 2026]

export default function AuditoriaCredenciadosPage() {
  const [mes, setMes] = useState(6)
  const [ano, setAno] = useState(2026)
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "marketplace" | "proprio">("todos")
  const [busca, setBusca] = useState("")
  const [drawerFornecedor, setDrawerFornecedor] = useState<Fornecedor | null>(null)
  const [expandedCotacao, setExpandedCotacao] = useState<string | null>(null)

  const filtered = MOCK_DATA.filter(f => {
    if (busca && !f.name.toLowerCase().includes(busca.toLowerCase()) && !f.cnpj.includes(busca)) return false
    if (tipoFiltro === "marketplace" && f.ocs_marketplace === 0) return false
    if (tipoFiltro === "proprio" && f.ocs_proprio === 0) return false
    return true
  })

  function exportCSV() {
    const header = "Período,Fornecedor,CNPJ,Cotações Recebidas,Respondidas,Taxa%,OCs Marketplace,OCs Próprio,Volume Total,Volume Marketplace,Volume Próprio,Ticket Médio"
    const rows = filtered.map(f => {
      const taxa = f.received > 0 ? ((f.answered / f.received) * 100).toFixed(1) : "0"
      const total_ocs = f.ocs_marketplace + f.ocs_proprio
      const ticket = total_ocs > 0 ? fmtBRL(f.volume_total_micros / total_ocs / 1_000_000) : "—"
      return [
        `${MESES[mes - 1]}/${ano}`, f.name, f.cnpj, f.received, f.answered, taxa,
        f.ocs_marketplace, f.ocs_proprio,
        fmtBRL(f.volume_total_micros / 1_000_000),
        fmtBRL(f.volume_marketplace_micros / 1_000_000),
        fmtBRL(f.volume_proprio_micros / 1_000_000),
        ticket,
      ].join(",")
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `auditoria-${MESES[mes - 1]}-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* Header */}
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

      {/* Filtros */}
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
        <div className="flex items-center gap-1">
          {(["todos", "marketplace", "proprio"] as const).map(v => (
            <button key={v} onClick={() => setTipoFiltro(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tipoFiltro === v ? "bg-[#0D1B3E] text-white" : "text-gray-500 hover:text-gray-800 bg-gray-50"
              }`}>
              {v === "todos" ? "Todos" : v === "marketplace" ? "Marketplace" : "Próprio"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Fornecedor", "Recebidas", "Respondidas", "Taxa %", "OCs Mktp.", "OCs Próprio", "Vol. Total", "Vol. Mktp.", "Vol. Próprio", "Ticket Médio"].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(f => {
              const taxa = f.received > 0 ? ((f.answered / f.received) * 100).toFixed(1) : "0"
              const total_ocs = f.ocs_marketplace + f.ocs_proprio
              const ticket = total_ocs > 0 ? fmtBRL(f.volume_total_micros / total_ocs / 1_000_000) : "—"
              return (
                <tr key={f.id} onClick={() => setDrawerFornecedor(f)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900 text-xs">{f.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.cnpj}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{f.received}</td>
                  <td className="px-3 py-3 text-gray-700">{f.answered}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp size={11} className="text-green-500" />
                      <span className="text-green-700 font-medium">{taxa}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">{f.ocs_marketplace}</td>
                  <td className="px-3 py-3 text-center">{f.ocs_proprio}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 text-xs">{fmtBRL(f.volume_total_micros / 1_000_000)}</td>
                  <td className="px-3 py-3 text-[#1565C0] font-medium text-xs">{fmtBRL(f.volume_marketplace_micros / 1_000_000)}</td>
                  <td className="px-3 py-3 text-[#E65100] font-medium text-xs">{fmtBRL(f.volume_proprio_micros / 1_000_000)}</td>
                  <td className="px-3 py-3 text-gray-700 text-xs">{ticket}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} fornecedor{filtered.length !== 1 ? "es" : ""} credenciado{filtered.length !== 1 ? "s" : ""} — {MESES[mes - 1]}/{ano}</p>
        </div>
      </div>

      {/* Drawer de drill-down */}
      {drawerFornecedor && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawerFornecedor(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{drawerFornecedor.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{drawerFornecedor.cnpj} · {MESES[mes - 1]}/{ano}</p>
              </div>
              <button onClick={() => setDrawerFornecedor(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 p-5 border-b border-gray-100">
              {[
                ["Recebidas", drawerFornecedor.received],
                ["Respondidas", drawerFornecedor.answered],
                ["Taxa", `${drawerFornecedor.received > 0 ? ((drawerFornecedor.answered / drawerFornecedor.received) * 100).toFixed(1) : 0}%`],
                ["OCs total", drawerFornecedor.ocs_marketplace + drawerFornecedor.ocs_proprio],
                ["Vol. Marketplace", fmtBRL(drawerFornecedor.volume_marketplace_micros / 1_000_000)],
                ["Vol. Próprio", fmtBRL(drawerFornecedor.volume_proprio_micros / 1_000_000)],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Cotações respondidas */}
            <div className="flex-1 overflow-y-auto p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cotações respondidas no período</h3>
              <div className="space-y-2">
                {drawerFornecedor.cotacoes.map((c) => (
                  <div key={c.code} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCotacao(expandedCotacao === c.code ? null : c.code)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-900">{c.code}</span>
                        <Badge color={c.autofilled ? "orange" : "blue"}>{c.autofilled ? "Próprio" : "Marketplace"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{fmtBRL(c.total_micros / 1_000_000)}</span>
                        {expandedCotacao === c.code ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </button>
                    {expandedCotacao === c.code && c.itens && (
                      <div className="border-t border-gray-100 px-4 pb-3 pt-2 bg-gray-50">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-gray-100">
                            {["Item", "Qtd", "Un.", "Preço"].map(h => (
                              <th key={h} className="text-left font-semibold text-gray-400 pb-1 pr-3">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {c.itens.map((it, ii) => (
                              <tr key={ii}>
                                <td className="py-1 pr-3 text-gray-700">{it.name}</td>
                                <td className="py-1 pr-3 text-gray-500">{it.qtd}</td>
                                <td className="py-1 pr-3 text-gray-400">{it.unit}</td>
                                <td className="py-1 text-gray-700 font-medium">{fmtBRL(it.preco_micros)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
