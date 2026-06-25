"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Package, MapPin, Calendar,
  Eye, ShoppingCart, Clock,
  Pencil, Trash2, MoreVertical, Copy, BarChart2
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { SkeletonList } from "@/components/ui/skeleton-list"
import { EmptyState } from "@/components/ui/empty-state"

interface Cotacao {
  id: string
  identifier: string
  obraplay_quotation_code?: string
  status: string
  need_date?: string
  expiry_date?: string
  response_date?: string
  created_at: string
  obra_name?: string
  delivery_city?: string
  delivery_state?: string
  item_count: number
  supplier_count: number
  created_by_name?: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "Enviada":                  { label: "Enviada",                  color: "#1565C0", bg: "#E3F2FD" },
  "Parcialmente respondida":  { label: "Parcialmente respondida",  color: "#FF9800", bg: "#FFF3E0" },
  "Respondida":               { label: "Respondida",               color: "#4CAF50", bg: "#E8F5E9" },
  "Ordem de compra gerada":   { label: "OC gerada",                color: "#6D28D9", bg: "#EDE9FE" },
  "Pendente revisão": { label: "Pendente revisão", color: "#FF9800", bg: "#FFF3E0" },
  "Convertida":       { label: "Convertida",       color: "#9C27B0", bg: "#F3E5F5" },
  "Cancelada":        { label: "Cancelada",        color: "#F44336", bg: "#FFEBEE" },
  "Rascunho":         { label: "Rascunho",         color: "#757575", bg: "#F5F5F5" },
}

const TABS = [
  { label: "Todas",            value: "Todas" },
  { label: "Enviadas",         value: "Enviada" },
  { label: "Parc. respondidas", value: "Parcialmente respondida" },
  { label: "Respondidas",      value: "Respondida" },
  { label: "OC gerada",        value: "Ordem de compra gerada" },
  { label: "Canceladas",       value: "Cancelada" },
  { label: "Rascunhos",        value: "Rascunho" },
]

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "#757575", bg: "#F5F5F5" }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function fmt(d?: string) {
  if (!d) return "—"
  const date = new Date(d)
  return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function CotacoesPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("Todas")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  async function duplicateCotacao(id: string) {
    setOpenMenuId(null)
    setDuplicatingId(id)
    try {
      const res = await authFetch(`/api/cotacoes/${id}/duplicate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao duplicar")
      toast.success("Cotação duplicada como rascunho!")
      router.push(`/dashboard/cotacoes/nova?draft_id=${data.id}`)
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao duplicar cotação")
    } finally {
      setDuplicatingId(null)
    }
  }

  useEffect(() => {
    if (!activeCompany?.id) return
    setLoading(true)
    authFetch(`/api/cotacoes?company_id=${activeCompany.id}`)
      .then(r => r.json()).then(d => setCotacoes(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [activeCompany?.id])

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const filtered = useMemo(() => {
    let list = tab === "Todas"
      ? cotacoes.filter(c => c.status !== "Rascunho") // "Todas" não mostra rascunhos
      : cotacoes.filter(c => c.status === tab)
    const q = norm(search.trim())
    if (!q) return list
    return list.filter(c =>
      norm(c.identifier).includes(q) ||
      norm(c.obraplay_quotation_code ?? "").includes(q) ||
      norm(c.obra_name ?? "").includes(q) ||
      norm(c.created_by_name ?? "").includes(q)
    )
  }, [cotacoes, tab, search])

  const countBy = (s: string) => cotacoes.filter(c => c.status === s).length

  async function deleteDraft(id: string) {
    setDeletingId(id)
    try {
      await authFetch(`/api/cotacoes/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      setCotacoes(prev => prev.filter(c => c.id !== id))
      toast.success("Rascunho excluído.")
    } catch {
      toast.error("Erro ao excluir rascunho.")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] px-4 pt-5 pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-[#212121]" style={{ fontSize: "1.15rem" }}>Cotações</h1>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2 mb-3">
          <Search size={16} className="text-[#9E9E9E] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por ID, obra ou vendedor..."
            className="bg-transparent flex-1 outline-none text-[#212121] placeholder-[#9E9E9E]"
            style={{ fontSize: "0.875rem" }} />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#9E9E9E] text-xl leading-none">&times;</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.value ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-[#757575]"
              }`}>
              {t.label}
              {t.value !== "Todas" && countBy(t.value) > 0 && (
                <span className="ml-1 opacity-50">({countBy(t.value)})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        {loading && <SkeletonList count={4} hasAvatar hasTag />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={ShoppingCart}
            title={search ? "Nenhuma cotação encontrada" : tab === "Rascunho" ? "Nenhum rascunho salvo" : "Nenhuma cotação ainda"}
            description={search ? "Tente ajustar o texto da busca." : tab === "Rascunho" ? "Cotações incompletas salvas aparecerão aqui." : "Crie sua primeira cotação para receber propostas de fornecedores."}
            action={!search && tab !== "Rascunho" ? { label: "Nova cotação", onClick: () => router.push("/dashboard/cotacoes/nova") } : undefined}
          />
        )}

        {!loading && filtered.map(c => {
          const cfg = STATUS_CFG[c.status] ?? { color: "#9E9E9E", bg: "#F5F5F5", label: c.status }
          const isDraft = c.status === "Rascunho"

          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
              <div className="p-4">
                {/* ID + status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="font-bold text-[#212121] tracking-widest"
                      style={{ fontSize: "0.95rem", fontFamily: "monospace" }}>
                      {c.obraplay_quotation_code
                        ? `Cotação: ${c.obraplay_quotation_code}`
                        : isDraft ? "Rascunho" : c.identifier}
                    </span>
                    {c.obra_name && (
                      <p className="text-[#757575] text-xs mt-0.5 truncate">{c.obra_name}</p>
                    )}
                  </div>
                  <StatusChip status={c.status} />
                </div>

                {/* Métricas */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2.5">
                  {c.item_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-[#757575]">
                      <Package size={12} />
                      {c.item_count} {c.item_count === 1 ? "item" : "itens"}
                    </span>
                  )}
                  {(c.delivery_city || c.delivery_state) && (
                    <span className="flex items-center gap-1 text-xs text-[#757575]">
                      <MapPin size={12} />
                      {[c.delivery_city, c.delivery_state].filter(Boolean).join(" - ")}
                    </span>
                  )}
                </div>

                {/* Datas */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3">
                  <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                    <Calendar size={11} /> {isDraft ? "Salvo em:" : "Solicitada:"} {fmt(c.created_at)}
                  </span>
                  {c.need_date && (
                    <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                      <Clock size={11} /> Necessidade: {fmtDate(c.need_date)}
                    </span>
                  )}
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#9E9E9E] truncate">
                    {c.created_by_name ? `Vendedor: ${c.created_by_name}` : ""}
                  </span>

                  {isDraft ? (
                    // Botões de rascunho
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {confirmDeleteId === c.id ? (
                        <>
                          <span className="text-xs text-[#F44336] font-semibold">Confirmar?</span>
                          <button
                            onClick={() => deleteDraft(c.id)}
                            disabled={deletingId === c.id}
                            className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[#FFEBEE] text-[#F44336] border border-[#F44336] hover:bg-[#FFCDD2] transition-colors">
                            {deletingId === c.id ? <Loader2 size={12} className="animate-spin" /> : "Excluir"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-[#757575] border border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#F44336] border border-[#F44336] hover:bg-[#FFEBEE] transition-colors">
                            <Trash2 size={12} /> Excluir
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/cotacoes/nova?draft_id=${c.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1565C0] hover:bg-[#1255A8] transition-colors">
                            <Pencil size={12} /> Continuar
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(c.status === "Respondida" || c.status === "Ordem de compra gerada") ? (
                        <button
                          onClick={() => router.push(`/dashboard/cotacoes/${c.id}/mapa`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1565C0] hover:bg-[#0D47A1] transition-colors">
                          <BarChart2 size={12} /> Mapa de cotação
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/dashboard/cotacoes/${c.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1565C0] border border-[#1565C0] hover:bg-[#E3F2FD] transition-colors">
                          <Eye size={12} /> Ver
                        </button>
                      )}
                      {/* Menu de tr��s pontinhos */}
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id) }}
                          disabled={duplicatingId === c.id}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
                          {duplicatingId === c.id
                            ? <Loader2 size={13} className="animate-spin text-[#1565C0]" />
                            : <MoreVertical size={15} className="text-[#616161]" />}
                        </button>
                        {openMenuId === c.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 bottom-8 z-20 bg-white rounded-xl shadow-lg border border-[#F0F0F0] min-w-[160px] overflow-hidden">
                              <button
                                onClick={() => duplicateCotacao(c.id)}
                                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#212121] hover:bg-[#F5F5F5] transition-colors text-left">
                                <Copy size={13} className="text-[#1565C0]" /> Duplicar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/dashboard/cotacoes/nova")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#1565C0] text-white shadow-lg flex items-center justify-center hover:bg-[#1255A8] active:scale-95 transition-all z-50"
        aria-label="Nova cotação">
        <Plus size={24} />
      </button>
    </div>
  )
}
