"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, X, Loader2, HardHat, MapPin, Ruler } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"

interface Obra {
  id: string
  name: string
  status: string
  type?: string
  area_m2?: number
  start_date?: string
  expected_end_date?: string
  delivery_city?: string
  delivery_state?: string
  is_own: boolean
  client_name?: string
  client_name_pf?: string
  client_name_pj?: string
  cover_url?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Em andamento": { label: "Em andamento", color: "#4CAF50", bg: "#E8F5E9" },
  "Orçamento":    { label: "Orçamento",    color: "#1565C0", bg: "#E3F2FD" },
  "Pausada":      { label: "Pausada",      color: "#FF9800", bg: "#FFF3E0" },
  "Concluída":    { label: "Concluída",    color: "#757575", bg: "#F5F5F5" },
  "Cancelada":    { label: "Cancelada",    color: "#F44336", bg: "#FFEBEE" },
}

const ALL_STATUS = ["Todos", ...Object.keys(STATUS_CONFIG)]

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#757575", bg: "#F5F5F5" }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

export default function ObrasPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")

  useEffect(() => {
    if (!activeCompany?.id) return
    setLoading(true)
    authFetch(`/api/obras?company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((d) => setObras(Array.isArray(d) ? d : []))
      .catch(() => setObras([]))
      .finally(() => setLoading(false))
  }, [activeCompany?.id])

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    return obras.filter((o) => {
      const clientName = o.client_name_pf ?? o.client_name_pj ?? ""
      const matchSearch = !q ||
        normalize(o.name).includes(q) ||
        normalize(clientName).includes(q)
      const matchStatus = statusFilter === "Todos" || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, obras])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 flex-shrink-0" style={{ height: 52 }}>
        <span className="font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Obras</span>
        <span className="ml-2 op-chip op-chip-neutral">{obras.length}</span>
      </div>

      {/* Busca */}
      <div className="op-search-bar flex-shrink-0">
        <Search size={18} className="text-[#9E9E9E] flex-shrink-0" />
        <input
          className="op-search-input"
          placeholder="Buscar por nome ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Limpar busca">
            <X size={16} className="text-[#9E9E9E]" />
          </button>
        )}
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {ALL_STATUS.map((s) => {
          const active = statusFilter === s
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors"
              style={active
                ? { backgroundColor: cfg?.color ?? "#1565C0", color: "#fff", borderColor: cfg?.color ?? "#1565C0" }
                : { backgroundColor: "#fff", color: "#757575", borderColor: "#E0E0E0" }
              }
            >
              {s}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      <div className="flex-1 px-3 pb-24 flex flex-col gap-2">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-[#9E9E9E]" style={{ fontSize: "0.875rem" }}>
            {obras.length === 0 ? "Nenhuma obra cadastrada ainda" : "Nenhuma obra encontrada"}
          </div>
        )}
        {!loading && filtered.map((o) => {
          const clientName = o.client_name_pf ?? o.client_name_pj
          const location = [o.delivery_city, o.delivery_state].filter(Boolean).join(" - ")
          return (
            <button
              key={o.id}
              onClick={() => router.push(`/dashboard/obras/${o.id}`)}
              className="relative w-full rounded-xl shadow-sm overflow-hidden text-left transition-transform active:scale-[0.99]"
              style={{ minHeight: 120 }}
            >
              {/* Background: foto de capa ou degradê azul como placeholder */}
              {o.cover_url ? (
                <>
                  <img src={o.cover_url} alt={o.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 60%, #42A5F5 100%)" }}
                  />
                  {/* Ícone decorativo de fundo */}
                  <div className="absolute -bottom-4 -right-4 opacity-10">
                    <HardHat size={96} className="text-white" />
                  </div>
                </>
              )}

              {/* Conteúdo sobre o background — sempre texto branco */}
              <div className="relative z-10 p-4 flex flex-col justify-between h-full text-white" style={{ minHeight: 120 }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold truncate drop-shadow" style={{ fontSize: "0.9rem" }}>
                    {o.name}
                  </span>
                  <StatusChip status={o.status} />
                </div>

                <div>
                  <p className="text-xs mb-1.5 text-white/80 drop-shadow">
                    {o.is_own ? "Obra própria" : clientName ?? "—"}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {location && (
                      <span className="flex items-center gap-1 text-xs text-white/70 drop-shadow">
                        <MapPin size={11} /> {location}
                      </span>
                    )}
                    {o.area_m2 && (
                      <span className="flex items-center gap-1 text-xs text-white/70 drop-shadow">
                        <Ruler size={11} /> {o.area_m2} m²
                      </span>
                    )}
                    {o.start_date && (
                      <span className="text-xs text-white/70 drop-shadow">
                        Início: {new Date(o.start_date).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/dashboard/obras/nova")}
        className="op-fab fixed bottom-6 right-4 z-20"
        aria-label="Nova obra"
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  )
}
