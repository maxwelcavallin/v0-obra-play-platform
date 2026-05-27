"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Search, Plus, X, Trash2, Loader2,
  Package, MapPin, Building2, User,
  ChevronRight, Check, Sparkles, AlertCircle
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { OpInput } from "@/components/ui/op-input"

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Insumo { id: string; name: string; unit: string; category: string }
interface Item { id: string; insumo_id?: string; name: string; unit: string; quantity: string }
interface Obra {
  id: string; name: string; client_name?: string
  delivery_city?: string; delivery_state?: string
  delivery_street?: string; delivery_number?: string
  delivery_neighbourhood?: string; delivery_zipcode?: string
  billing_street?: string; billing_number?: string
  billing_neighbourhood?: string; billing_city?: string
  billing_state?: string; billing_zipcode?: string
}
interface Supplier {
  id: string; name: string; city: string; categories: string[]
  rating: number; response_time: string; is_recommended: boolean
  email?: string; phone?: string; initials: string; color: string
}

const AVATAR_COLORS = ["#1565C0","#FF9800","#F44336","#2196F3","#795548","#607D8B","#E91E63","#4CAF50","#9C27B0","#FF5722"]
function getInitials(name: string) { return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() }
function getColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length] }

const MIN_RATINGS = ["Todas", "4.0+", "4.5+", "4.8+"]

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  const steps = ["Itens", "Obra", "Fornecedores"]
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? "bg-[#1565C0] text-white" : active ? "bg-[#1565C0] text-white" : "bg-[#E0E0E0] text-[#9E9E9E]"
              }`}>
                {done ? <Check size={13} /> : idx}
              </div>
              <span className={`text-xs font-medium ${active ? "text-[#1565C0]" : done ? "text-[#1565C0]" : "text-[#9E9E9E]"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-10 mb-4 mx-1 transition-colors ${done ? "bg-[#1565C0]" : "bg-[#E0E0E0]"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NovaCotacaoPage() {
  const router = useRouter()
  const { activeCompany, user } = useAuth()
  const [step, setStep] = useState(1)

  // Passo 1 — Itens
  const [items, setItems] = useState<Item[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [insumoSearch, setInsumoSearch] = useState("")
  const [showInsumoDrop, setShowInsumoDrop] = useState(false)
  const [needDate, setNeedDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [generalNotes, setGeneralNotes] = useState("")
  // Mini-form item personalizado
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customUnit, setCustomUnit] = useState("")
  const [customQty, setCustomQty] = useState("")

  // Passo 2 — Obra
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [obraSearch, setObraSearch] = useState("")
  const [showObraDrop, setShowObraDrop] = useState(false)
  const [useBilling, setUseBilling] = useState(false)
  const [financialBox, setFinancialBox] = useState<"empresa" | "obra">("empresa")
  const [reqName, setReqName] = useState(user?.name ?? "")
  const [reqEmail, setReqEmail] = useState(user?.email ?? "")
  const [reqPhone, setReqPhone] = useState("")

  // Passo 3 — Fornecedores
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState("")
  const [ratingFilter, setRatingFilter] = useState("Todas")
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!activeCompany?.id) return
    authFetch(`/api/insumos?company_id=${activeCompany.id}`)
      .then(r => r.json()).then(d => setInsumos(Array.isArray(d) ? d : []))
      .catch(() => {})
    authFetch(`/api/obras?company_id=${activeCompany.id}`)
      .then(r => r.json()).then(d => setObras(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [activeCompany?.id])

  useEffect(() => {
    if (user?.name)  setReqName(user.name)
    if (user?.email) setReqEmail(user.email)
    if (user?.phone) setReqPhone(user.phone)
  }, [user])

  // Busca fornecedores reais da ObraPlay quando uma obra é selecionada
  async function fetchSuppliers(obra: Obra) {
    const city  = obra.delivery_city  ?? ""
    const state = obra.delivery_state ?? ""
    if (!city && !state) return
    setLoadingSuppliers(true)
    setSuppliers([])
    try {
      const res = await authFetch(`/api/obraplay/fornecedores?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`)
      const data = await res.json()
      // A API retorna { results: [...] } (paginado) ou array direto
      const list: any[] = Array.isArray(data) ? data : (data.results ?? [])
      setSuppliers(list.map((s: any) => ({
        id:             String(s.id),
        name:           s.name ?? s.company_name ?? "Fornecedor",
        city:           s.city ? `${s.city}${s.state ? " - " + s.state : ""}` : "",
        categories:     s.categories ?? [],
        rating:         parseFloat(s.rating ?? s.score ?? "0") || 0,
        response_time:  s.response_time ?? "",
        is_recommended: Boolean(s.is_certified ?? s.is_recommended),
        email:          s.email ?? "",
        phone:          s.phone ?? "",
        initials:       getInitials(s.name ?? s.company_name ?? "?"),
        color:          getColor(s.name ?? s.company_name ?? "?"),
      })))
    } catch {
      toast.error("Não foi possível carregar fornecedores para esta localização.")
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  // ─ Insumos filtrados ──────────────────────────────────────────────────────
  const filteredInsumos = useMemo(() => {
    const q = norm(insumoSearch.trim())
    if (!q) return insumos.slice(0, 20)
    return insumos.filter(i =>
      norm(i.name).includes(q) || norm(i.category).includes(q)
    ).slice(0, 20)
  }, [insumos, insumoSearch])

  function addInsumo(i: Insumo) {
    setItems(prev => [...prev, { id: crypto.randomUUID(), insumo_id: i.id, name: i.name, unit: i.unit, quantity: "1" }])
    setInsumoSearch(""); setShowInsumoDrop(false)
  }

  function addCustomItem() {
    if (!customName.trim() || !customUnit.trim() || !customQty.trim()) {
      toast.error("Preencha nome, unidade e quantidade do item."); return
    }
    setItems(prev => [...prev, { id: crypto.randomUUID(), name: customName.trim(), unit: customUnit.trim(), quantity: customQty }])
    setCustomName(""); setCustomUnit(""); setCustomQty(""); setCustomOpen(false)
  }

  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }
  function updateItem(id: string, field: "quantity" | "unit", value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  // ─ Validação passo 1 ──────────────────────────────────────────────────────
  function validateStep1() {
    if (items.length === 0) { toast.error("Adicione pelo menos um item."); return false }
    if (!needDate) { toast.error("Informe a data de necessidade."); return false }
    if (!expiryDate) { toast.error("Informe a data de expiração."); return false }
    return true
  }

  // ─ Obras filtradas ────────────────────────────────────────────────────────
  const filteredObras = useMemo(() => {
    const q = norm(obraSearch.trim())
    if (!q) return obras.slice(0, 15)
    return obras.filter(o =>
      norm(o.name).includes(q) || norm(o.client_name ?? "").includes(q) || norm(o.delivery_city ?? "").includes(q)
    ).slice(0, 15)
  }, [obras, obraSearch])

  function selectObra(o: Obra) {
    setSelectedObra(o)
    setObraSearch(o.name)
    setShowObraDrop(false)
    fetchSuppliers(o)
  }

  const displayAddress = useMemo(() => {
    if (!selectedObra) return null
    if (useBilling) {
      return {
        street: selectedObra.billing_street, number: selectedObra.billing_number,
        neighbourhood: selectedObra.billing_neighbourhood, city: selectedObra.billing_city,
        state: selectedObra.billing_state, zipcode: selectedObra.billing_zipcode,
      }
    }
    return {
      street: selectedObra.delivery_street, number: selectedObra.delivery_number,
      neighbourhood: selectedObra.delivery_neighbourhood, city: selectedObra.delivery_city,
      state: selectedObra.delivery_state, zipcode: selectedObra.delivery_zipcode,
    }
  }, [selectedObra, useBilling])

  // ─ Fornecedores filtrados (certificados primeiro) ─────────────────────────
  const filteredSuppliers = useMemo(() => {
    let list = [...suppliers]
    const q = norm(supplierSearch.trim())
    if (q) list = list.filter(s => norm(s.name).includes(q) || norm(s.city).includes(q))
    if (ratingFilter !== "Todas") {
      const min = parseFloat(ratingFilter)
      list = list.filter(s => s.rating >= min)
    }
    // Certificados primeiro, depois por rating decrescente
    list.sort((a, b) => {
      if (a.is_recommended !== b.is_recommended) return a.is_recommended ? -1 : 1
      return b.rating - a.rating
    })
    return list
  }, [suppliers, supplierSearch, ratingFilter])

  const recommended = filteredSuppliers.filter(s => s.is_recommended)
  const others = filteredSuppliers.filter(s => !s.is_recommended)

  function toggleSupplier(id: string) {
    setSelectedSuppliers(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ─ Enviar cotação ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (selectedSuppliers.size === 0) { toast.error("Selecione pelo menos um fornecedor."); return }
    setSubmitting(true)
    try {
      const supplierList = suppliers.filter(s => selectedSuppliers.has(s.id)).map(s => ({
        name: s.name, city: s.city, email: s.email, phone: s.phone, is_recommended: s.is_recommended
      }))
      const res = await authFetch("/api/cotacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: activeCompany?.id,
          obra_id: selectedObra?.id ?? null,
          need_date: needDate || null,
          expiry_date: expiryDate || null,
          general_notes: generalNotes || null,
          address_type: useBilling ? "cobrança" : "entrega",
          financial_box: financialBox,
          requester_name: reqName || null,
          requester_email: reqEmail || null,
          requester_phone: reqPhone || null,
          items: items.map(i => ({ insumo_id: i.insumo_id ?? null, name: i.name, unit: i.unit, quantity: parseFloat(i.quantity) || 1 })),
          suppliers: supplierList,
        }),
      })
      if (!res.ok) throw new Error("Erro ao criar cotação")
      toast.success("Cotação enviada com sucesso!")
      router.push("/dashboard/cotacoes")
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar cotação")
    } finally {
      setSubmitting(false)
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Header fixo */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-[#9E9E9E] font-medium">Nova Cotação</p>
            <h1 className="font-bold text-[#212121]" style={{ fontSize: "1rem" }}>
              {step === 1 ? "Itens" : step === 2 ? "Obra e Endereço" : "Fornecedores"}
            </h1>
          </div>
        </div>
        <div className="pb-3 px-4">
          <Stepper step={step} />
        </div>
      </div>

      {/* ════════════ PASSO 1 — ITENS ════════════ */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto pb-28">
          <div className="px-4 pt-4">

            {/* Busca de insumos */}
            <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">BUSCAR INSUMO</p>
            <div className="relative mb-4">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E0E0E0] px-3 py-2.5">
                <Search size={15} className="text-[#9E9E9E] flex-shrink-0" />
                <input
                  value={insumoSearch}
                  onChange={e => { setInsumoSearch(e.target.value); setShowInsumoDrop(true) }}
                  onFocus={() => setShowInsumoDrop(true)}
                  placeholder="Buscar insumo por nome ou categoria..."
                  className="flex-1 outline-none text-[#212121] placeholder-[#9E9E9E] bg-transparent"
                  style={{ fontSize: "0.875rem" }} />
                {insumoSearch && (
                  <button onClick={() => { setInsumoSearch(""); setShowInsumoDrop(false) }}>
                    <X size={14} className="text-[#9E9E9E]" />
                  </button>
                )}
              </div>
              {showInsumoDrop && filteredInsumos.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E0E0E0] shadow-lg z-30 max-h-52 overflow-y-auto">
                  {filteredInsumos.map(i => (
                    <button key={i.id} onMouseDown={() => addInsumo(i)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-0 text-left">
                      <div>
                        <p className="text-sm font-medium text-[#212121]">{i.name}</p>
                        <p className="text-xs text-[#9E9E9E]">{i.category}</p>
                      </div>
                      <span className="text-xs text-[#757575] bg-[#F5F5F5] px-2 py-0.5 rounded-full">{i.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tabela de itens */}
            {items.length > 0 && (
              <div className="mb-4">
                <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">ITENS ADICIONADOS</p>
                <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
                  {items.map((item, idx) => (
                    <div key={item.id}
                      className={`px-4 py-3 flex items-center gap-3 ${idx < items.length - 1 ? "border-b border-[#F5F5F5]" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                        <Package size={13} className="text-[#1565C0]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#212121] truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            value={item.quantity}
                            onChange={e => updateItem(item.id, "quantity", e.target.value)}
                            className="w-16 border border-[#E0E0E0] rounded-lg px-2 py-1 text-xs text-[#212121] outline-none focus:border-[#1565C0]"
                            placeholder="Qtd" type="number" min="0.01" step="0.01" />
                          <input
                            value={item.unit}
                            onChange={e => updateItem(item.id, "unit", e.target.value)}
                            className="w-16 border border-[#E0E0E0] rounded-lg px-2 py-1 text-xs text-[#212121] outline-none focus:border-[#1565C0]"
                            placeholder="Un." />
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#FFEBEE] transition-colors flex-shrink-0">
                        <Trash2 size={14} className="text-[#F44336]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Item personalizado */}
            <button onClick={() => setCustomOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#E0E0E0] hover:border-[#1565C0] text-[#757575] hover:text-[#1565C0] transition-colors mb-4">
              <Plus size={16} />
              <span className="text-sm font-medium">Adicionar item personalizado</span>
            </button>

            {customOpen && (
              <div className="bg-white rounded-xl border border-[#E0E0E0] p-4 mb-4">
                <p className="text-[#616161] font-bold mb-3 text-xs uppercase tracking-wider">ITEM PERSONALIZADO</p>
                <div className="flex flex-col gap-3">
                  <OpInput label="Nome do item *" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: Parafuso M6" />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <OpInput label="Unidade *" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="Ex: un, kg, m" />
                    </div>
                    <div className="flex-1">
                      <OpInput label="Quantidade *" value={customQty} onChange={e => setCustomQty(e.target.value)} type="number" placeholder="Ex: 100" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setCustomOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#E0E0E0] text-sm text-[#757575] font-medium">
                      Cancelar
                    </button>
                    <button onClick={addCustomItem}
                      className="flex-1 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold">
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Datas */}
            <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">DATAS</p>
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-4 mb-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs text-[#9E9E9E] mb-1">Data de necessidade *</label>
                <input type="date" value={needDate} onChange={e => setNeedDate(e.target.value)}
                  className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none focus:border-[#1565C0]" />
              </div>
              <div>
                <label className="block text-xs text-[#9E9E9E] mb-1">Expiração da cotação *</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none focus:border-[#1565C0]" />
              </div>
            </div>

            {/* Observações */}
            <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">OBSERVAÇÕES</p>
            <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Observações gerais para os fornecedores..."
              rows={3}
              className="w-full bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 text-sm text-[#212121] placeholder-[#9E9E9E] outline-none focus:border-[#1565C0] resize-none mb-4" />
          </div>
        </div>
      )}

      {/* ════════════ PASSO 2 — OBRA ════════════ */}
      {step === 2 && (
        <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4">

          <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">OBRA</p>
          <div className="relative mb-4">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E0E0E0] px-3 py-2.5">
              <Search size={15} className="text-[#9E9E9E] flex-shrink-0" />
              <input value={obraSearch}
                onChange={e => { setObraSearch(e.target.value); setShowObraDrop(true); if (!e.target.value) setSelectedObra(null) }}
                onFocus={() => setShowObraDrop(true)}
                placeholder="Buscar obra por nome, cliente ou cidade..."
                className="flex-1 outline-none text-[#212121] placeholder-[#9E9E9E] bg-transparent"
                style={{ fontSize: "0.875rem" }} />
              {obraSearch && (
                <button onClick={() => { setObraSearch(""); setSelectedObra(null); setShowObraDrop(false) }}>
                  <X size={14} className="text-[#9E9E9E]" />
                </button>
              )}
            </div>
            {showObraDrop && filteredObras.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E0E0E0] shadow-lg z-30 max-h-52 overflow-y-auto">
                {filteredObras.map(o => (
                  <button key={o.id} onMouseDown={() => selectObra(o)}
                    className="w-full flex items-start justify-between px-4 py-3 hover:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-0 text-left">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#212121] truncate">{o.name}</p>
                      {o.client_name && <p className="text-xs text-[#9E9E9E] truncate">{o.client_name}</p>}
                    </div>
                    {(o.delivery_city || o.delivery_state) && (
                      <span className="text-xs text-[#757575] flex-shrink-0 ml-2">
                        {[o.delivery_city, o.delivery_state].filter(Boolean).join(" - ")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card de endereço selecionado */}
          {selectedObra && displayAddress && (
            <div className="bg-[#E3F2FD] rounded-xl p-4 mb-4 border border-[#BBDEFB]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1565C0] text-sm">{selectedObra.name}</p>
                  {displayAddress.street && (
                    <p className="text-xs text-[#1565C0]/80 mt-0.5">
                      {[displayAddress.street, displayAddress.number].filter(Boolean).join(", ")}
                      {displayAddress.neighbourhood ? ` - ${displayAddress.neighbourhood}` : ""}
                    </p>
                  )}
                  {displayAddress.city && (
                    <p className="text-xs text-[#1565C0]/80">
                      {[displayAddress.city, displayAddress.state].filter(Boolean).join(" - ")}
                      {displayAddress.zipcode ? ` — CEP ${displayAddress.zipcode}` : ""}
                    </p>
                  )}
                </div>
              </div>
              {/* Toggle cobrança */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#BBDEFB]">
                <span className="text-xs text-[#1565C0] font-medium">Usar endereço de cobrança</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useBilling}
                  onClick={() => setUseBilling(b => !b)}
                  className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ${useBilling ? "bg-[#1565C0]" : "bg-[#BDBDBD]"}`}>
                  <span className={`absolute top-0.5 bottom-0.5 aspect-square bg-white rounded-full shadow-sm transition-all duration-200 ${useBilling ? "left-[calc(100%-1.25rem-2px)]" : "left-[2px]"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Caixa financeiro */}
          <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">CAIXA FINANCEIRO</p>
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-4 mb-4 flex gap-3">
            {(["empresa", "obra"] as const).map(opt => (
              <button key={opt} onClick={() => setFinancialBox(opt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  financialBox === opt
                    ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]"
                    : "border-[#E0E0E0] text-[#757575]"
                }`}>
                {opt === "empresa"
                  ? (activeCompany?.fantasy_name ?? "Empresa")
                  : (selectedObra?.name ?? "Obra")}
              </button>
            ))}
          </div>

          {/* Dados do solicitante */}
          <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">DADOS DO SOLICITANTE</p>
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-4 flex flex-col gap-4 mb-4">
            <OpInput label="Nome" value={reqName} onChange={e => setReqName(e.target.value)} />
            <OpInput label="E-mail" value={reqEmail} onChange={e => setReqEmail(e.target.value)} type="email" />
            <OpInput label="Telefone" value={reqPhone} onChange={e => setReqPhone(e.target.value)} type="tel" />
          </div>
        </div>
      )}

      {/* ════════════ PASSO 3 — FORNECEDORES ════════════ */}
      {step === 3 && (
        <div className="flex-1 overflow-y-auto pb-36 px-4 pt-4">

          {/* Contexto de localização */}
          {selectedObra?.delivery_city && (
            <div className="flex items-center gap-2 mb-4 bg-[#E3F2FD] rounded-xl px-3 py-2.5 border border-[#BBDEFB]">
              <MapPin size={13} className="text-[#1565C0] flex-shrink-0" />
              <p className="text-xs text-[#1565C0] font-medium">
                Fornecedores que entregam em <strong>{selectedObra.delivery_city} - {selectedObra.delivery_state}</strong>
              </p>
            </div>
          )}

          {/* Busca + filtro de avaliação */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E0E0E0] px-3 py-2.5">
              <Search size={15} className="text-[#9E9E9E] flex-shrink-0" />
              <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="flex-1 outline-none text-[#212121] placeholder-[#9E9E9E] bg-transparent"
                style={{ fontSize: "0.875rem" }} />
              {supplierSearch && (
                <button onClick={() => setSupplierSearch("")}><X size={14} className="text-[#9E9E9E]" /></button>
              )}
            </div>
            <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}
              className="border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm bg-white text-[#212121] outline-none">
              {MIN_RATINGS.map(r => <option key={r} value={r}>{r === "Todas" ? "Todas as avaliações" : `Avaliação acima de ${r}`}</option>)}
            </select>
          </div>

          {/* Loading */}
          {loadingSuppliers && (
            <div className="flex flex-col items-center justify-center pt-12 gap-3 text-[#9E9E9E]">
              <Loader2 size={28} className="animate-spin text-[#1565C0]" />
              <p className="text-sm">Buscando fornecedores na região...</p>
            </div>
          )}

          {/* Sem obra selecionada */}
          {!loadingSuppliers && !selectedObra && (
            <div className="flex flex-col items-center justify-center pt-12 gap-2 text-[#9E9E9E]">
              <Building2 size={36} strokeWidth={1.2} />
              <p className="text-sm text-center">Selecione uma obra no passo anterior para carregar os fornecedores da região.</p>
            </div>
          )}

          {/* Certificados */}
          {!loadingSuppliers && recommended.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className="text-[#1565C0]" />
                <p className="text-[#1565C0] font-bold text-xs uppercase tracking-wider">Fornecedores Certificados</p>
              </div>
              <div className="flex flex-col gap-2">
                {recommended.map(s => <SupplierCard key={s.id} supplier={s} selected={selectedSuppliers.has(s.id)} onToggle={() => toggleSupplier(s.id)} />)}
              </div>
            </div>
          )}

          {/* Demais fornecedores */}
          {!loadingSuppliers && others.length > 0 && (
            <div className="mb-4">
              <p className="text-[#616161] font-bold mb-3 text-xs uppercase tracking-wider">OUTROS FORNECEDORES</p>
              <div className="flex flex-col gap-2">
                {others.map(s => <SupplierCard key={s.id} supplier={s} selected={selectedSuppliers.has(s.id)} onToggle={() => toggleSupplier(s.id)} />)}
              </div>
            </div>
          )}

          {/* Nenhum resultado após busca */}
          {!loadingSuppliers && selectedObra && !loadingSuppliers && filteredSuppliers.length === 0 && suppliers.length > 0 && (
            <div className="flex flex-col items-center justify-center pt-8 gap-2 text-[#9E9E9E]">
              <Building2 size={36} strokeWidth={1.2} />
              <p className="text-sm">Nenhum fornecedor encontrado com esses filtros.</p>
            </div>
          )}

          {/* Sem fornecedores na região */}
          {!loadingSuppliers && selectedObra && suppliers.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-8 gap-2 text-[#9E9E9E]">
              <AlertCircle size={36} strokeWidth={1.2} />
              <p className="text-sm text-center">Nenhum fornecedor ObraPlay encontrado nesta região.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer fixo ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-4 z-20" style={{ maxWidth: 480, margin: "0 auto" }}>
        {step === 3 && selectedSuppliers.size > 0 && (
          <div className="flex items-center gap-2 mb-3 bg-[#E3F2FD] rounded-xl px-4 py-2">
            <Check size={14} className="text-[#1565C0]" />
            <span className="text-xs text-[#1565C0] font-semibold">
              {selectedSuppliers.size} fornecedor{selectedSuppliers.size > 1 ? "es" : ""} selecionado{selectedSuppliers.size > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !validateStep1()) return
              setStep(s => s + 1)
            }}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#1255A8] transition-colors">
            Continuar
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedSuppliers.size === 0}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#1255A8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {submitting ? "Enviando..." : "Enviar cotação"}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Card de fornecedor ───────────────────────────────────────────────────────
function SupplierCard({ supplier: s, selected, onToggle }: { supplier: Supplier; selected: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`w-full bg-white rounded-2xl border-2 p-4 text-left transition-all ${
        selected ? "border-[#1565C0] bg-[#F8FBFF]" : "border-[#E0E0E0] hover:border-[#BBDEFB]"
      }`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: s.color }}>
          {s.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#212121] text-sm">{s.name}</span>
                {s.is_recommended && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#1565C0]">
                    Recomendado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-[#9E9E9E]" />
                <span className="text-xs text-[#9E9E9E]">{s.city}</span>
              </div>
            </div>
            {/* Checkbox */}
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selected ? "border-[#1565C0] bg-[#1565C0]" : "border-[#E0E0E0]"
            }`}>
              {selected && <Check size={12} className="text-white" />}
            </div>
          </div>

          {/* Rating + tempo */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={11} className="text-[#FF9800] fill-[#FF9800]" />
              <span className="text-xs font-semibold text-[#212121]">{s.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-[#9E9E9E]" />
              <span className="text-xs text-[#9E9E9E]">{s.response_time}</span>
            </div>
          </div>

          {/* Categorias */}
          <div className="flex flex-wrap gap-1 mt-2">
            {s.categories.map(c => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#757575]">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
