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
              className="bg-white rounded-xl shadow-sm p-4 text-left hover:bg-[#FAFAFA] transition-colors w-full"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                    <HardHat size={16} className="text-[#1565C0]" />
                  </div>
                  <span className="font-semibold text-[#212121] truncate" style={{ fontSize: "0.9rem" }}>
                    {o.name}
                  </span>
                </div>
                <StatusChip status={o.status} />
              </div>

              <p className="text-[#757575] text-xs mb-2">
                {o.is_own ? "Obra própria" : clientName ?? "—"}
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                {location && (
                  <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                    <MapPin size={11} /> {location}
                  </span>
                )}
                {o.area_m2 && (
                  <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                    <Ruler size={11} /> {o.area_m2} m²
                  </span>
                )}
                {o.start_date && (
                  <span className="text-xs text-[#9E9E9E]">
                    Início: {new Date(o.start_date).toLocaleDateString("pt-BR")}
                  </span>
                )}
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
