"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const MOCK = [
  { id: "oc1", code: "OC-ZMSDNDL", fornecedor: "Depósito Central Materiais", fornecedor_id: "1", status: "Entregue", total: 8200000, created_at: "2026-06-23", arrival_estimate: "2026-07-08" },
  { id: "oc2", code: "OC-ABCDEFG", fornecedor: "Ferro e Aço Paulista", fornecedor_id: "3", status: "Em andamento", total: 9100000, created_at: "2026-06-22", arrival_estimate: "2026-07-10" },
  { id: "oc3", code: "OC-HIJKLMN", fornecedor: "Casa da Construção Norte", fornecedor_id: "2", status: "Aguardando confirmação", total: 15400000, created_at: "2026-06-20", arrival_estimate: "2026-07-15" },
]

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray"> = {
  "Entregue": "green",
  "Em andamento": "blue",
  "Aguardando confirmação": "orange",
  "Cancelada": "gray",
}

export default function OrdensObraPlayPage() {
  const [q, setQ] = useState("")
  const filtered = MOCK.filter(o =>
    !q || o.code.toLowerCase().includes(q.toLowerCase()) ||
    o.fornecedor.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ordens de Compra</h1>
            <p className="text-sm text-gray-400">via API Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Identificador ou fornecedor..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Identificador", "Fornecedor", "Status", "Valor", "Criada em", "Entrega prevista", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{o.code}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/empresas/${o.fornecedor_id}`} className="font-medium text-[#1565C0] hover:underline">{o.fornecedor}</Link>
                </td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[o.status] ?? "gray"}>{o.status}</Badge></td>
                <td className="px-4 py-3 font-medium text-gray-900">{fmtBRL(o.total)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.arrival_estimate)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/ordens/${o.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} ordem{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
