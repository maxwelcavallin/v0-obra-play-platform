"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Usuario = {
  id: string; name: string; email: string; phone: string | null
  companies_count: number; created_at: string; is_active: boolean
}

export default function UsuariosConstructorPage() {
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSWR(
    `/api/admin/constructor/usuarios?q=${encodeURIComponent(query)}&status=${statusFiltro === "todos" ? "" : statusFiltro === "ativo" ? "active" : "inactive"}&page=${page}`,
    fetcher
  )

  const rows: Usuario[] = data?.rows ?? []
  const total: number = data?.total ?? 0

  function handleSearch() { setQuery(q); setPage(1) }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Usuários Constructor</h1>
          <p className="text-sm text-gray-400">Banco de dados local</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {(["todos", "ativo", "inativo"] as const).map(v => (
              <button key={v} onClick={() => { setStatusFiltro(v); setPage(1) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFiltro === v ? "bg-[#0D1B3E] text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Nome ou e-mail..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-60 outline-none focus:border-[#1565C0]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nome", "E-mail", "Telefone", "Empresas", "Cadastro", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum usuário encontrado.</td></tr>
            )}
            {rows.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-700 text-center">{u.companies_count}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3"><Badge color={u.is_active ? "green" : "gray"}>{u.is_active ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/usuarios/${u.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} usuário{total !== 1 ? "s" : ""}</p>
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
