"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ExternalLink, Filter } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"

type Cotacao = {
  id: string; code: string; name: string; email: string; phone: string
  published_at: string; requirement_date: string
  is_answered: boolean; is_converted: boolean; is_expired: boolean
  is_canceled: boolean; autofilled: boolean
}

const MOCK: Cotacao[] = [
  { id: "1", code: "UHUTQJG", name: "José Pereira", email: "jose@construtorasp.com.br", phone: "(11) 9 8765-4321", published_at: "2026-06-20", requirement_date: "2026-07-10", is_answered: true, is_converted: true, is_expired: false, is_canceled: false, autofilled: false },
  { id: "2", code: "3SQME6Y", name: "Ana Costa", email: "ana@obrasnorte.com.br", phone: "(92) 9 7654-3210", published_at: "2026-06-18", requirement_date: "2026-07-05", is_answered: true, is_converted: false, is_expired: false, is_canceled: false, autofilled: false },
  { id: "3", code: "XKBM2P4", name: "Roberto Alves", email: "roberto@constralves.com.br", phone: "(31) 9 6543-2109", published_at: "2026-06-15", requirement_date: "2026-06-28", is_answered: false, is_converted: false, is_expired: true, is_canceled: false, autofilled: true },
  { id: "4", code: "7YNRV18", name: "Fernanda Lima", email: "fernanda@limaconstrucoes.com.br", phone: "(85) 9 5432-1098", published_at: "2026-06-12", requirement_date: "2026-07-01", is_answered: false, is_converted: false, is_expired: false, is_canceled: true, autofilled: false },
  { id: "5", code: "PQLS9A3", name: "Carlos Mendes", email: "carlos@mendesengenharia.com.br", phone: "(19) 9 4321-0987", published_at: "2026-06-10", requirement_date: "2026-06-30", is_answered: true, is_converted: true, is_expired: false, is_canceled: false, autofilled: true },
]

const STATUS_FILTERS = [
  { key: "is_answered", label: "Respondida" },
  { key: "is_converted", label: "Convertida" },
  { key: "is_expired", label: "Expirada" },
  { key: "is_canceled", label: "Cancelada" },
  { key: "autofilled_true", label: "Próprio" },
  { key: "autofilled_false", label: "Marketplace" },
]

export default function CotacoesMarketplacePage() {
  const [q, setQ] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  function toggleFilter(key: string) {
    setActiveFilters(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])
  }

  const filtered = MOCK.filter(c => {
    if (q && !c.code.toLowerCase().includes(q.toLowerCase()) &&
        !c.name.toLowerCase().includes(q.toLowerCase()) &&
        !c.email.toLowerCase().includes(q.toLowerCase()) &&
        !c.phone.includes(q)) return false
    for (const f of activeFilters) {
      if (f === "is_answered" && !c.is_answered) return false
      if (f === "is_converted" && !c.is_converted) return false
      if (f === "is_expired" && !c.is_expired) return false
      if (f === "is_canceled" && !c.is_canceled) return false
      if (f === "autofilled_true" && !c.autofilled) return false
      if (f === "autofilled_false" && c.autofilled) return false
    }
    return true
  })

  function statusBadges(c: Cotacao) {
    const badges = []
    if (c.is_converted) badges.push(<Badge key="conv" color="green">Convertida</Badge>)
    else if (c.is_answered) badges.push(<Badge key="ans" color="blue">Respondida</Badge>)
    if (c.is_expired) badges.push(<Badge key="exp" color="red">Expirada</Badge>)
    if (c.is_canceled) badges.push(<Badge key="can" color="gray">Cancelada</Badge>)
    if (!c.is_answered && !c.is_expired && !c.is_canceled) badges.push(<Badge key="pend" color="orange">Pendente</Badge>)
    return badges
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cotações do Marketplace</h1>
            <p className="text-sm text-gray-400">via API Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Código, nome, e-mail ou telefone..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-72 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-400 flex items-center gap-1"><Filter size={11} /> Filtros:</span>
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => toggleFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeFilters.includes(f.key)
                ? "bg-[#0D1B3E] text-white border-[#0D1B3E]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {f.label}
          </button>
        ))}
        {activeFilters.length > 0 && (
          <button onClick={() => setActiveFilters([])} className="text-xs text-red-500 hover:underline ml-1">Limpar</button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Código", "Solicitante", "Contato", "Publicada", "Necessidade", "Status", "Tipo", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-gray-900 text-xs">{c.code}</span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500">{c.email}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.published_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.requirement_date)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">{statusBadges(c)}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={c.autofilled ? "orange" : "blue"}>{c.autofilled ? "Próprio" : "Marketplace"}</Badge>
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
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} cotação{filtered.length !== 1 ? "ões" : ""}</p>
        </div>
      </div>
    </div>
  )
}
