"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Search, RefreshCw, Check, X, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function AdminUsuarios() {
  const [search, setSearch]   = useState("")
  const [status, setStatus]   = useState("all")
  const [page, setPage]       = useState(1)
  const [query, setQuery]     = useState("")
  const [toggling, setToggling] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/usuarios?search=${encodeURIComponent(query)}&status=${status}&page=${page}`,
    fetcher
  )

  const handleSearch = useCallback(() => {
    setQuery(search)
    setPage(1)
  }, [search])

  async function toggleStatus(userId: string, currentActive: boolean) {
    setToggling(userId)
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_active: !currentActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(!currentActive ? "Usuário reativado" : "Usuário desativado")
      mutate()
    } catch {
      toast.error("Erro ao alterar status")
    } finally {
      setToggling(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#212121]">Usuários</h1>
        <p className="text-sm text-[#9E9E9E] mt-1">Gerencie todos os usuários da plataforma</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#9E9E9E]" />
          <input
            className="text-sm outline-none flex-1 bg-transparent"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="bg-[#1565C0] text-white text-sm px-4 py-2 rounded-lg font-medium">
          Buscar
        </button>
        <select
          className="text-sm border border-[#EEEEEE] rounded-lg px-3 py-2 bg-white outline-none"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-[#EEEEEE] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#9E9E9E] text-sm">
            <RefreshCw size={14} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EEEEEE]">
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Nome</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Email</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Empresas</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Cadastro</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.rows?.map((u: {
                id: string
                name: string
                email: string
                company_count: number
                created_at: string
                is_active: boolean
                is_platform_admin: boolean
              }) => (
                <tr key={u.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#212121]">{u.name}</span>
                      {u.is_platform_admin && (
                        <ShieldCheck size={13} className="text-[#1565C0]" aria-label="Admin" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{u.email}</td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{u.company_count}</td>
                  <td className="px-5 py-3.5 text-sm text-[#9E9E9E]">{fmtDate(u.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      u.is_active ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"
                    }`}>
                      {u.is_active ? <Check size={10} /> : <X size={10} />}
                      {u.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      disabled={toggling === u.id}
                      onClick={() => toggleStatus(u.id, u.is_active)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#EEEEEE] text-[#616161] hover:border-[#BDBDBD] transition-colors disabled:opacity-40"
                    >
                      {u.is_active ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#EEEEEE]">
            <p className="text-xs text-[#9E9E9E]">{data.total} usuários encontrados</p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#EEEEEE] disabled:opacity-40"
              >Anterior</button>
              <span className="text-xs text-[#9E9E9E]">Página {page} de {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#EEEEEE] disabled:opacity-40"
              >Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
