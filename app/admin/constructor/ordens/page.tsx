"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, ExternalLink } from "lucide-react"
import { Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray"> = {
  "Enviada ao fornecedor": "blue",
  "Entregue": "green",
  "Cancelada": "gray",
  "Pendente": "orange",
}

export default function ConstructorOrdensPage() {
  const [q, setQ] = useState("")
  const { data, isLoading } = useSWR(
    `/api/admin/constructor/ordens?q=${encodeURIComponent(q)}`,
    fetcher
  )
  const items: Record<string, unknown>[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ordens de Compra</h1>
          <p className="text-sm text-gray-400">Todas as OCs geradas pelas empresas construtoras</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Código, empresa ou fornecedor..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Código", "Empresa", "Fornecedor", "Status", "Total", "Criada em", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma ordem encontrada.</td></tr>
            ) : items.map((o) => (
              <tr key={String(o.id)} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{String(o.identifier ?? o.obraplay_order_code ?? "—")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/empresas/${o.company_id}`} className="font-medium text-[#1565C0] hover:underline text-sm">
                    {String(o.company_name ?? "—")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(o.supplier_name ?? "—")}</td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[String(o.status)] ?? "gray"}>{String(o.status ?? "—")}</Badge></td>
                <td className="px-4 py-3 font-medium text-gray-900">{fmtBRL(Number(o.total ?? 0))}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(String(o.created_at ?? ""))}</td>
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
          <p className="text-xs text-gray-400">{total} ordem{total !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
