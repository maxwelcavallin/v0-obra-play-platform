"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Company = {
  company_id: number; short_name: string; full_name: string; city: string; state: string
  verified_cnpj: boolean; has_confirmed_address: boolean; has_confirmed_shipping: boolean
  has_confirmed_configuration: boolean; rating: number | null; total_reviews: number
  avg_response_time_minutes: number | null; finalized_answers_count: number
  last_sync_at: string | null; registration_type: "certified" | "validated" | "basic"
}

function BoolIcon({ v }: { v: boolean }) {
  return v ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-300" />
}

const NIVEL_LABELS: Record<string, string> = { certified: "Certificado", validated: "Validado", basic: "Básico" }
const NIVEL_COLOR: Record<string, "green" | "blue" | "gray"> = { certified: "green", validated: "blue", basic: "gray" }

export default function EmpresasFornecedorasPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [nivel, setNivel] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSWR(
    `/api/admin/obraplay/empresas?q=${encodeURIComponent(query)}&nivel=${nivel}&page=${page}`,
    fetcher
  )

  const rows: Company[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Empresas Fornecedoras</h1>
            <p className="text-sm text-gray-400">Espelho local do Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="flex items-center gap-2">
          <select value={nivel} onChange={e => { setNivel(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] bg-white">
            <option value="">Todos os níveis</option>
            <option value="certified">Certificado</option>
            <option value="validated">Validado</option>
            <option value="basic">Básico</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por nome..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-72 outline-none focus:border-[#1565C0]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Empresa</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Cidade/UF</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Nível</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">CNPJ Ver.</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Endereço</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Entrega</th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Respostas</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma empresa encontrada.</td></tr>
            )}
            {rows.map(c => (
              <tr key={c.company_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.full_name || c.short_name}</p>
                  <p className="text-xs text-gray-400">{c.short_name}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">{c.city}, {c.state}</td>
                <td className="px-4 py-3">
                  <Badge color={NIVEL_COLOR[c.registration_type]}>{NIVEL_LABELS[c.registration_type]}</Badge>
                </td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.verified_cnpj} /></td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.has_confirmed_address} /></td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.has_confirmed_shipping} /></td>
                <td className="px-4 py-3 text-right text-gray-700">{c.finalized_answers_count}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.last_sync_at ? fmtDate(c.last_sync_at) : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/empresas/${c.company_id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} empresa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}</p>
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
