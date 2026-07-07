"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Search, RefreshCw, MapPin, Clock, BadgeCheck, CheckCircle, MinusCircle } from "lucide-react"
import { toast } from "sonner"
import { RegistrationBadge } from "@/components/ui/registration-badge"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function fmtMinutes(m?: number | null) {
  if (m == null) return "—"
  if (m < 60) return `${Math.round(m)} min`
  return `${(m / 60).toFixed(1)} h`
}

export default function AdminFornecedores() {
  const [search, setSearch]   = useState("")
  const [query, setQuery]     = useState("")
  const [level, setLevel]     = useState("all")
  const [page, setPage]       = useState(1)
  const [syncing, setSyncing] = useState(false)

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/fornecedores?search=${encodeURIComponent(query)}&level=${level}&page=${page}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleSearch = useCallback(() => {
    setQuery(search)
    setPage(1)
  }, [search])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/fornecedores/sync", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      toast.success("Sincronização iniciada com sucesso")
      setTimeout(() => mutate(), 3000)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro na sincronização")
    } finally {
      setSyncing(false)
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  const COLS: ColDef[] = [
    { label: "Fornecedor",  key: "short_name" },
    { label: "Nível",       key: "registration_type" },
    { label: "Localidade",  key: "city" },
    { label: "Membros",     key: "member_count",              numeric: true },
    { label: "Resp. médio", key: "avg_response_time_minutes", numeric: true },
    { label: "Respostas",   key: "finalized_answers_count",   numeric: true },
    { label: "Última sync", key: "last_sync_at" },
  ]
  const rows = data?.rows ?? []
  const { sorted, sortKey, sortDir, toggle } = useSortable(rows)

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Fornecedores ObraPlay</h1>
          <p className="text-sm text-[#9E9E9E] mt-1">
            {data?.total ?? "—"} fornecedores sincronizados
            {data?.sync?.last_sync_at ? ` · Última sync: ${fmtDate(data.sync.last_sync_at)}` : ""}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#1565C0] text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-60 flex-shrink-0"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sync manual"}
        </button>
      </div>

      {/* Alerta de erro de sync */}
      {data?.sync?.last_error && (
        <div className="mb-4 text-sm text-[#F44336] bg-[#FFEBEE] px-4 py-3 rounded-lg">
          Último erro: {data.sync.last_error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-[#9E9E9E]" />
          <input
            className="text-sm outline-none flex-1 bg-transparent"
            placeholder="Nome ou cidade..."
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
          value={level}
          onChange={e => { setLevel(e.target.value); setPage(1) }}
        >
          <option value="all">Todos os níveis</option>
          <option value="certified">Certificado</option>
          <option value="validated">Validado</option>
          <option value="basic">Básico</option>
        </select>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[#9E9E9E]">
        <span className="flex items-center gap-1"><BadgeCheck size={12} className="text-[#2E7D32]" /> Certificado</span>
        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-[#1565C0]" /> Validado</span>
        <span className="flex items-center gap-1"><MinusCircle size={12} className="text-[#9E9E9E]" /> Básico</span>
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
                {COLS.map(col => <SortableTh key={col.label} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />)}
              </tr>
            </thead>
            <tbody>
              {(sorted as any[]).map((s) => (
                <tr key={s.company_id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-[#212121]">{s.short_name}</p>
                    {s.full_name && s.full_name !== s.short_name && (
                      <p className="text-[11px] text-[#9E9E9E] truncate max-w-[220px]">{s.full_name}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <RegistrationBadge type={s.registration_type} variant="pill" />
                  </td>
                  <td className="px-5 py-3.5">
                    {s.city && (
                      <span className="text-sm text-[#616161] flex items-center gap-1">
                        <MapPin size={11} className="text-[#BDBDBD]" />
                        {s.city}{s.state ? `, ${s.state}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{s.member_count}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#616161] flex items-center gap-1">
                      <Clock size={11} className="text-[#BDBDBD]" />
                      {fmtMinutes(s.avg_response_time_minutes)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#616161]">{s.finalized_answers_count ?? 0}</td>
                  <td className="px-5 py-3.5 text-sm text-[#9E9E9E]">{fmtDate(s.last_sync_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#EEEEEE]">
            <p className="text-xs text-[#9E9E9E]">{data.total} fornecedores</p>
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
