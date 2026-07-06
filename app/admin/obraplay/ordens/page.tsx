"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Ordem = {
  id: string; obraplay_order_code: string | null; status: string
  supplier_name: string; mirror_company_id: number | null
  total_amount: number | null; created_at: string; arrival_estimate: string | null
  company_name: string; requester_name: string
}

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray" | "red"> = {
  "Enviada ao fornecedor": "blue",
  "Confirmada": "green",
  "Em andamento": "orange",
  "Entregue": "green",
  "Cancelada": "red",
}

export default function OrdensObraPlayPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSWR(
    `/api/admin/obraplay/ordens?q=${encodeURIComponent(query)}&page=${page}`,
    fetcher
  )

  const rows: Ordem[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ordens de Compra</h1>
            <p className="text-sm text-gray-400">Banco de dados local — Constructor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Código, fornecedor ou empresa..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Código", "Empresa", "Fornecedor", "Status", "Valor", "Criada", "Entrega", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma ordem encontrada.</td></tr>
            )}
            {rows.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-gray-900 text-xs">{o.obraplay_order_code ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-sm">{o.company_name}</td>
                <td className="px-4 py-3">
                  {o.mirror_company_id ? (
                    <Link href={`/admin/obraplay/empresas/${o.mirror_company_id}`} className="font-medium text-[#1565C0] hover:underline text-sm">{o.supplier_name}</Link>
                  ) : (
                    <span className="font-medium text-gray-900 text-sm">{o.supplier_name}</span>
                  )}
                </td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[o.status] ?? "gray"}>{o.status}</Badge></td>
                <td className="px-4 py-3 font-medium text-gray-900">{o.total_amount != null ? fmtBRL(o.total_amount) : "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.arrival_estimate ? fmtDate(o.arrival_estimate) : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/ordens/${o.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} ordem{total !== 1 ? "s" : ""}</p>
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
