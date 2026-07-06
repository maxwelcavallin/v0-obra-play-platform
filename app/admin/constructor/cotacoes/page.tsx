"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, ExternalLink } from "lucide-react"
import { Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray"> = {
  "Rascunho": "gray",
  "Enviada": "blue",
  "Respondida": "green",
  "Expirada": "gray",
  "Cancelada": "gray",
}

export default function ConstructorCotacoesPage() {
  const [q, setQ] = useState("")
  const { data, isLoading } = useSWR("/api/admin/constructor/cotacoes", fetcher)
  const items: Record<string, unknown>[] = data?.cotacoes ?? []

  const filtered = items.filter((c: Record<string, unknown>) =>
    !q ||
    String(c.identifier ?? "").toLowerCase().includes(q.toLowerCase()) ||
    String(c.company_name ?? "").toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cotações</h1>
          <p className="text-sm text-gray-400">Todas as cotações das empresas construtoras</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Identificador ou empresa..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Identificador", "Empresa", "Obra", "Status", "Itens", "Necessidade", "Criada em", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma cotação encontrada.</td></tr>
            ) : filtered.map((c) => (
              <tr key={String(c.id)} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{String(c.identifier ?? "—")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/empresas/${c.company_id}`} className="font-medium text-[#1565C0] hover:underline text-sm">
                    {String(c.company_name ?? "—")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(c.obra_name ?? "—")}</td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[String(c.status)] ?? "gray"}>{String(c.status ?? "—")}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-600">{String(c.item_count ?? 0)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(String(c.need_date ?? ""))}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(String(c.created_at ?? ""))}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/cotacoes/${c.id}`} target="_blank" className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} cotaç{filtered.length !== 1 ? "ões" : "ão"}</p>
        </div>
      </div>
    </div>
  )
}
