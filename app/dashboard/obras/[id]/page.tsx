"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2, MapPin, Ruler, Calendar, HardHat, Pencil, PowerOff } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface Obra {
  id: string; name: string; status: string; type?: string; area_m2?: number
  start_date?: string; expected_end_date?: string; is_own: boolean
  client_name?: string; client_type?: string; cover_url?: string; cover_position?: string
  delivery_street?: string; delivery_number?: string; delivery_complement?: string
  delivery_neighbourhood?: string; delivery_city?: string; delivery_state?: string; delivery_zipcode?: string
  same_billing_address: boolean
  billing_street?: string; billing_number?: string; billing_complement?: string
  billing_neighbourhood?: string; billing_city?: string; billing_state?: string; billing_zipcode?: string
  notes?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Em andamento": { label: "Em andamento", color: "#4CAF50", bg: "#E8F5E9" },
  "Orçamento":    { label: "Orçamento",    color: "#1565C0", bg: "#E3F2FD" },
  "Pausada":      { label: "Pausada",      color: "#FF9800", bg: "#FFF3E0" },
  "Concluída":    { label: "Concluída",    color: "#757575", bg: "#F5F5F5" },
  "Inativa":      { label: "Inativa",      color: "#F44336", bg: "#FFEBEE" },
  "Cancelada":    { label: "Cancelada",    color: "#F44336", bg: "#FFEBEE" },
}

const TABS = ["Dados", "Cotações", "OCs", "Financeiro"] as const
type Tab = typeof TABS[number]

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col py-2.5 border-b border-[#F5F5F5] last:border-0">
      <span className="text-xs text-[#9E9E9E]">{label}</span>
      <span className="text-sm text-[#212121] mt-0.5">{value}</span>
    </div>
  )
}

function AddressBlock({ prefix, obra }: { prefix: "delivery" | "billing"; obra: Obra }) {
  const street = obra[`${prefix}_street`]
  const number = obra[`${prefix}_number`]
  const complement = obra[`${prefix}_complement`]
  const neighbourhood = obra[`${prefix}_neighbourhood`]
  const city = obra[`${prefix}_city`]
  const state = obra[`${prefix}_state`]
  const zipcode = obra[`${prefix}_zipcode`]
  if (!street && !city) return <p className="text-sm text-[#9E9E9E]">Não informado</p>
  const line1 = [street, number, complement].filter(Boolean).join(", ")
  const line2 = [neighbourhood, city, state].filter(Boolean).join(", ")
  return (
    <div>
      {line1 && <p className="text-sm text-[#212121]">{line1}</p>}
      {line2 && <p className="text-sm text-[#757575]">{line2}</p>}
      {zipcode && <p className="text-xs text-[#9E9E9E] mt-0.5">CEP: {zipcode}</p>}
    </div>
  )
}

export default function ObraDetalhePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>("Dados")
  const [deactivating, setDeactivating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/obras/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d) => { if (d) setObra(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDeactivate() {
    if (!confirmDeactivate) { setConfirmDeactivate(true); return }
    setDeactivating(true)
    try {
      const newStatus = isCancelled ? "Orçamento" : "Inativa"
      const res = await authFetch(`/api/obras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...obra, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setObra((prev) => prev ? { ...prev, status: newStatus } : prev)
      setConfirmDeactivate(false)
      toast.success(newStatus === "Inativa" ? "Obra inativada" : "Obra reativada")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )

  if (notFound || !obra) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <p className="text-[#757575]">Obra não encontrada.</p>
    </div>
  )

  const cfg = STATUS_CONFIG[obra.status] ?? { label: obra.status, color: "#757575", bg: "#F5F5F5" }
  const location = [obra.delivery_city, obra.delivery_state].filter(Boolean).join(" - ")
  const isCancelled = obra.status === "Inativa" || obra.status === "Cancelada"

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Hero: foto de capa ou header azul */}
      <div className="relative flex-shrink-0" style={{ minHeight: 160 }}>
        {obra.cover_url ? (
          <>
            <img src={obra.cover_url} alt="Capa da obra" className="w-full object-cover" style={{ height: 160, objectPosition: obra.cover_position ?? "50% 50%" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#1565C0]" />
        )}

        {/* Nav bar sobreposta */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 pt-2" style={{ height: 52 }}>
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-colors" aria-label="Voltar">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/dashboard/obras/${id}/editar`)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold">
              <Pencil size={13} /> Editar
            </button>
            <button onClick={handleDeactivate} disabled={deactivating}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full transition-colors text-xs font-semibold ${confirmDeactivate ? "bg-red-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}>
              {deactivating ? <Loader2 size={13} className="animate-spin" /> : <PowerOff size={13} />}
              {confirmDeactivate ? "Confirmar" : isCancelled ? "Reativar" : "Inativar"}
            </button>
          </div>
        </div>

        {/* Nome e infos sobre a imagem */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!obra.cover_url && (
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <HardHat size={18} className="text-white" />
                </div>
              )}
              <h1 className="text-white font-bold leading-tight drop-shadow" style={{ fontSize: "1.1rem" }}>{obra.name}</h1>
            </div>
            <span className="rounded-full px-3 py-0.5 text-xs font-semibold flex-shrink-0" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap mt-1.5">
            {location && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><MapPin size={11} /> {location}</span>}
            {obra.area_m2 && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><Ruler size={11} /> {obra.area_m2} m²</span>}
            {obra.start_date && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><Calendar size={11} /> {new Date(obra.start_date).toLocaleDateString("pt-BR")}</span>}
          </div>
        </div>
      </div>

      {/* Confirmação de cancelamento */}
      {confirmDeactivate && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-red-700 font-medium">{isCancelled ? "Reativar esta obra?" : "Inativar esta obra?"}</p>
          <button onClick={() => setConfirmDeactivate(false)} className="text-xs text-red-500 underline">Cancelar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[#1565C0] flex flex-shrink-0">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? "text-white border-b-2 border-white" : "text-white/60"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "Dados" && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-[#9E9E9E] mb-2 tracking-wide">INFORMAÇÕES GERAIS</p>
              <InfoRow label="Tipo de obra" value={obra.type} />
              <InfoRow label="Cliente" value={obra.is_own ? "Obra própria" : (obra.client_name ?? "—")} />
              <InfoRow label="Status" value={obra.status} />
              <InfoRow label="Área" value={obra.area_m2 ? `${obra.area_m2} m²` : null} />
              <InfoRow label="Data de início" value={obra.start_date ? new Date(obra.start_date).toLocaleDateString("pt-BR") : null} />
              <InfoRow label="Previsão de conclusão" value={obra.expected_end_date ? new Date(obra.expected_end_date).toLocaleDateString("pt-BR") : null} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-[#9E9E9E] mb-3 tracking-wide">ENDEREÇOS</p>
              <div className="mb-3">
                <p className="text-xs font-medium text-[#757575] mb-1 flex items-center gap-1"><MapPin size={11} /> Entrega</p>
                <AddressBlock prefix="delivery" obra={obra} />
              </div>
              <div className="border-t border-[#F5F5F5] pt-3">
                <p className="text-xs font-medium text-[#757575] mb-1 flex items-center gap-1"><MapPin size={11} /> Cobrança</p>
                {obra.same_billing_address
                  ? <p className="text-sm text-[#9E9E9E]">Mesmo endereço de entrega</p>
                  : <AddressBlock prefix="billing" obra={obra} />}
              </div>
            </div>

            {obra.notes && obra.notes.trim() && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-[#9E9E9E] mb-2 tracking-wide">OBSERVAÇÕES</p>
                <p className="text-sm text-[#424242] whitespace-pre-wrap">{obra.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab !== "Dados" && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center">
              <HardHat size={22} className="text-[#1565C0]" />
            </div>
            <p className="text-[#9E9E9E] text-sm">Em breve</p>
          </div>
        )}
      </div>
    </div>
  )
}
