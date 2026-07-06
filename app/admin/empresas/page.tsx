"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Search, RefreshCw, MapPin } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

function fmtCNPJ(cnpj?: string | null) {
  if (!cnpj) return "—"
  const d = cnpj.replace(/\D/g, "")
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

export default function AdminEmpresas() {
  const [search, setSearch]   = useState("")
  const [query, setQuery]     = useState("")
  const [page, setPage]       = useState(1)
  const [acting, setActing]   = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/empresas?search=${encodeURIComponent(query)}&page=${page}`,
    fetcher
  )

  const handleSearch = useCallback(() => {
    setQuery(search)
    setPage(1)
  }, [search])

  async function handleAction(companyId: string, action: "bloquear" | "reativar") {
    setActing(companyId)
    try {
      const res = await fetch("/api/admin/empresas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action }),
      })
      if (!res.ok) throw new Error()
      toast.success(action === "bloquear" ? "Empresa bloqueada" : "Empresa reativada")
      mutate()
    } catch {
      toast.error("Erro ao executar ação")
    } finally {
      setActing(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#212121]">Empresas</h1>
        <p className="text-sm text-[#9E9E9E] mt-1">Construtoras e empresas cadastradas na plataforma</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-[#9E9E9E]" />
          <input
            className="text-sm outline-none flex-1 bg-transparent"
            placeholder="Razão social, nome fantasia ou CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="bg-[#1565C0] text-white text-sm px-4 py-2 rounded-lg font-medium">
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#EEEEEE] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#9E9E9E] text-sm">
            <RefreshCw size={14} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EEEEEE]">
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Empresa</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">CNPJ</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Localidade</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Usuários</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Cotações</th>
                <th className="text-left text-[11px] font-semibold text-[#9E9E9E] uppercase tracking-wide px-5 py-3">Cadastro</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.rows?.map((c: {
                id: string
                fantasy_name: string
                company_name: string
                cnpj: string
                city: string
                state: string
                user_count: number
                cotacao_count: number
                created_at: string
              }) => (
                <tr key={c.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-[#212121]">{c.fantasy_name || c.company_name}</p>
                    {c.fantasy_name && <p className="text-[11px] text-[#9E9E9E]">{c.company_name}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#616161] font-mono">{fmtCNPJ(c.cnpj)}</td>
                  <td className="px-5 py-3.5">
                    {c.city && (
                      <span className="text-sm text-[#616161] flex items-center gap-1">
                        <MapPin size={11} className="text-[#BDBDBD]" />
                        {c.city}{c.state ? `, ${c.state}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{c.user_count}</td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{c.cotacao_count}</td>
                  <td className="px-5 py-3.5 text-sm text-[#9E9E9E]">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={acting === c.id}
                        onClick={() => handleAction(c.id, "bloquear")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#FFCDD2] text-[#C62828] hover:bg-[#FFEBEE] transition-colors disabled:opacity-40"
                      >
                        Bloquear
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#EEEEEE]">
            <p className="text-xs text-[#9E9E9E]">{data.total} empresas encontradas</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1.5 rounded-lg border border-[#EEEEEE] disabled:opacity-40">Anterior</button>
              <span className="text-xs text-[#9E9E9E]">Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1.5 rounded-lg border border-[#EEEEEE] disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
