"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const MOCK = [
  { id: "r1", fornecedor: "Depósito Central Materiais", fornecedor_id: "1", cotacao: "UHUTQJG", cotacao_id: "1", date: "2026-06-22", total: 8200000, autofilled: false },
  { id: "r2", fornecedor: "Ferro e Aço Paulista", fornecedor_id: "3", cotacao: "UHUTQJG", cotacao_id: "1", date: "2026-06-21", total: 9100000, autofilled: false },
  { id: "r3", fornecedor: "Casa da Construção Norte", fornecedor_id: "2", cotacao: "3SQME6Y", cotacao_id: "2", date: "2026-06-19", total: 15400000, autofilled: true },
  { id: "r4", fornecedor: "Material Hidráulico Nordeste", fornecedor_id: "5", cotacao: "PQLS9A3", cotacao_id: "5", date: "2026-06-11", total: 6750000, autofilled: true },
]

export default function RespostasCotacaoPage() {
  const [q, setQ] = useState("")
  const filtered = MOCK.filter(r =>
    !q || r.fornecedor.toLowerCase().includes(q.toLowerCase()) ||
    r.cotacao.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Respostas de Cotação</h1>
            <p className="text-sm text-gray-400">via API Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Fornecedor ou código de cotação..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Fornecedor", "Cotação", "Data", "Valor total", "Tipo", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/empresas/${r.fornecedor_id}`} className="font-medium text-[#1565C0] hover:underline">{r.fornecedor}</Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/cotacoes/${r.cotacao_id}`} className="font-mono text-xs text-[#1565C0] hover:underline">{r.cotacao}</Link>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.date)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{fmtBRL(r.total)}</td>
                <td className="px-4 py-3"><Badge color={r.autofilled ? "orange" : "blue"}>{r.autofilled ? "Próprio" : "Marketplace"}</Badge></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/respostas/${r.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} resposta{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
