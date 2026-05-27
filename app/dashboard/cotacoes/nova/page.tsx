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
  // Modo de endereço de entrega: obra | empresa | manual
  const [addressMode, setAddressMode] = useState<"obra" | "empresa" | "manual">("obra")
  const [companyDetail, setCompanyDetail] = useState<any>(null)
  const [manualZipcode, setManualZipcode] = useState("")
  const [manualStreet, setManualStreet] = useState("")
  const [manualNumber, setManualNumber] = useState("")
  const [manualNeighbourhood, setManualNeighbourhood] = useState("")
  const [manualCity, setManualCity] = useState("")
  const [manualState, setManualState] = useState("")
  const [cepLoading, setCepLoading] = useState(false)
  const [reqName, setReqName] = useState(user?.name ?? "")
  const [reqEmail, setReqEmail] = useState(user?.email ?? "")
  const [reqPhone, setReqPhone] = useState("")

  // Passo 3 — Fornecedores
  const [isPublic, setIsPublic] = useState(false)
  const [mirrorSuppliers, setMirrorSuppliers] = useState<any[]>([])
  const [loadingMirror, setLoadingMirror] = useState(false)
  const [mirrorFetched, setMirrorFetched] = useState(false)
  const [mirrorNeedsSync, setMirrorNeedsSync] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState("")
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set())
  const [manualSuppliers, setManualSuppliers] = useState<{ name: string; email: string; phone: string }[]>([])
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupName, setNewSupName] = useState("")
  const [newSupEmail, setNewSupEmail] = useState("")
  const [newSupPhone, setNewSupPhone] = useState("")
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

  // ─ Auto-preenchimento de CEP (endereço manual) ───────────────────────────
  async function fetchManualCep(raw: string) {
    const digits = raw.replace(/\D/g, "")
    const formatted = digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
    setManualZipcode(formatted)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const json = await res.json()
      if (json.erro) return
      setManualStreet(json.logradouro ?? "")
      setManualNeighbourhood(json.bairro ?? "")
      setManualCity(json.localidade ?? "")
      setManualState(json.uf ?? "")
    } catch {
      // CEP não encontrado — usuário preenche manualmente
    } finally {
      setCepLoading(false)
    }
  }

  // ─ Busca fornecedores no mirror por cidade/estado ────────────────────────
  async function fetchMirrorSuppliers(city: string, state: string) {
    if (!city && !state) return
    setLoadingMirror(true)
    setMirrorFetched(true)
    setMirrorNeedsSync(false)
    setMirrorSuppliers([])
    setSelectedSupplierIds(new Set())
    try {
      const qs = new URLSearchParams()
      if (city)  qs.set("city",  city)
      if (state) qs.set("state", state)
      qs.set("per_page", "50")
      const res  = await authFetch(`/api/obraplay/suppliers?${qs}`)
      const data = await res.json()
      if (data.needsSync) { setMirrorNeedsSync(true); return }
      setMirrorSuppliers(data.suppliers ?? [])
    } catch {
      toast.error("Não foi possível carregar fornecedores.")
    } finally {
      setLoadingMirror(false)
    }
  }

  // ─ Validação passo 2 ─────────────────────────────────────────────────────
  function validateStep2() {
    if (addressMode === "obra" && !selectedObra) {
      toast.error("Selecione uma obra ou escolha outro modo de endereço de entrega.")
      return false
    }
    if (addressMode === "empresa" && !activeCompany) {
      toast.error("Nenhuma empresa ativa encontrada para usar como endereço.")
      return false
    }
    if (addressMode === "manual") {
      if (!manualStreet.trim() || !manualCity.trim() || !manualState.trim()) {
        toast.error("Preencha ao menos rua, cidade e estado do endereço manual.")
        return false
      }
    }
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


  // ─ Enviar cotação ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!isPublic && selectedSupplierIds.size === 0 && manualSuppliers.length === 0) {
      toast.error("Selecione pelo menos um fornecedor ou marque a cotação como pública.")
      return
    }
    setSubmitting(true)
    try {
      const mirrorSelected = mirrorSuppliers
        .filter(s => selectedSupplierIds.has(s.id))
        .map(s => ({ name: s.company_name, email: s.email || undefined, phone: s.phone || s.whatsapp || undefined, is_recommended: s.registration_type === "certified", mirror_company_id: s.id }))
      const supplierList = [
        ...mirrorSelected,
        ...manualSuppliers.map(s => ({ name: s.name, email: s.email || undefined, phone: s.phone || undefined, is_recommended: false })),
      ]
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
          is_public: isPublic,
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

      {/* ���═══════════ PASSO 1 — ITENS ════════════ */}
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

          {/* Seletor de modo de endereço de entrega */}
          <p className="text-[#616161] font-bold mb-2 text-xs uppercase tracking-wider">ENDEREÇO DE ENTREGA *</p>
          <div className="flex gap-2 mb-4">
            {(["obra", "empresa", "manual"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setAddressMode(mode)
                  if (mode === "empresa" && activeCompany?.id && !companyDetail) {
                    authFetch(`/api/empresas/${activeCompany.id}`)
                      .then(r => r.json())
                      .then(d => setCompanyDetail(d))
                      .catch(() => {})
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                  addressMode === mode
                    ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]"
                    : "border-[#E0E0E0] text-[#757575] bg-white"
                }`}>
                {mode === "obra" ? "Da obra" : mode === "empresa" ? "Da empresa" : "Manual"}
              </button>
            ))}
          </div>

          {/* Modo Obra */}
          {addressMode === "obra" && (
            <>
          <p className="text-[#9E9E9E] text-xs mb-2">Selecione uma obra para usar seu endereço de entrega.</p>
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

            </>
          )}

          {/* Modo Empresa */}
          {addressMode === "empresa" && (
            <div className="bg-[#E3F2FD] rounded-xl p-4 mb-4 border border-[#BBDEFB]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
                  <Building2 size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1565C0] text-sm truncate">
                    {activeCompany?.fantasyName ?? "Empresa"}
                  </p>
                  {companyDetail ? (
                    <>
                      {(companyDetail.street || companyDetail.city) ? (
                        <p className="text-xs text-[#1565C0]/80 mt-0.5 leading-relaxed">
                          {[companyDetail.street, companyDetail.number].filter(Boolean).join(", ")}
                          {companyDetail.complement ? ` — ${companyDetail.complement}` : ""}
                          {companyDetail.neighbourhood ? `, ${companyDetail.neighbourhood}` : ""}
                          {(companyDetail.city || companyDetail.state) ? ` · ${[companyDetail.city, companyDetail.state].filter(Boolean).join(" - ")}` : ""}
                          {companyDetail.zipcode ? ` · CEP ${companyDetail.zipcode}` : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-[#1565C0]/60 mt-0.5 italic">Endereço não cadastrado</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[#1565C0]/60 mt-0.5 italic">Carregando...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modo Manual */}
          {addressMode === "manual" && (
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-4 mb-4 flex flex-col gap-3">
              <div className="relative">
                <OpInput
                  label="CEP"
                  value={manualZipcode}
                  onChange={e => fetchManualCep(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 size={14} className="animate-spin text-[#9E9E9E] absolute right-0 bottom-2" />
                )}
              </div>
              <OpInput label="Rua / Logradouro *" value={manualStreet} onChange={e => setManualStreet(e.target.value)} placeholder="Ex: Rua das Flores" />
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <OpInput label="Número" value={manualNumber} onChange={e => setManualNumber(e.target.value)} placeholder="Ex: 123" />
                </div>
                <div className="flex-[3]">
                  <OpInput label="Bairro" value={manualNeighbourhood} onChange={e => setManualNeighbourhood(e.target.value)} placeholder="Ex: Centro" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-[3]">
                  <OpInput label="Cidade *" value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="Ex: São Paulo" />
                </div>
                <div className="flex-[1]">
                  <OpInput label="UF *" value={manualState} onChange={e => setManualState(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
                </div>
              </div>
            </div>
          )}

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

          {/* Cotação pública */}
          <button type="button" onClick={() => setIsPublic(p => !p)}
            className={`w-full flex items-center gap-3 rounded-xl p-4 mb-5 border-2 transition-colors text-left ${isPublic ? "border-[#1565C0] bg-[#E3F2FD]" : "border-[#E0E0E0] bg-white"}`}>
            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${isPublic ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BDBDBD]"}`}>
              {isPublic && <Check size={12} className="text-white" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isPublic ? "text-[#1565C0]" : "text-[#212121]"}`}>Cotação pública</p>
              <p className="text-xs text-[#757575] mt-0.5">Qualquer fornecedor da plataforma ObraPlay poderá ver e responder esta cotação.</p>
            </div>
          </button>

          {/* Fornecedores do mirror ObraPlay */}
          <p className="text-[#616161] font-bold mb-1 text-xs uppercase tracking-wider">FORNECEDORES OBRAPLAY</p>

          {/* Loading */}
          {loadingMirror && (
            <div className="flex items-center gap-2 py-6 justify-center text-[#9E9E9E]">
              <Loader2 size={18} className="animate-spin text-[#1565C0]" />
              <p className="text-sm">Buscando fornecedores na região...</p>
            </div>
          )}

          {/* Precisa sincronizar */}
          {!loadingMirror && mirrorNeedsSync && (
            <div className="flex flex-col items-center gap-2 py-6 text-[#9E9E9E] text-center">
              <AlertCircle size={28} strokeWidth={1.2} />
              <p className="text-sm">Base de fornecedores ainda não sincronizada.</p>
              <button onClick={async () => {
                setLoadingMirror(true)
                await authFetch("/api/obraplay/sync", { method: "POST" }).catch(() => {})
                setMirrorNeedsSync(false)
                const c = companyDetail ?? activeCompany
                const city  = addressMode === "obra" ? selectedObra?.delivery_city ?? "" : addressMode === "manual" ? manualCity : (c as any)?.city ?? ""
                const state = addressMode === "obra" ? selectedObra?.delivery_state ?? "" : addressMode === "manual" ? manualState : (c as any)?.state ?? ""
                await fetchMirrorSuppliers(city, state)
              }} className="text-xs text-[#1565C0] font-semibold underline">Sincronizar agora</button>
            </div>
          )}

          {/* Busca e lista */}
          {!loadingMirror && !mirrorNeedsSync && mirrorFetched && (
            <>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E0E0E0] px-3 py-2.5 mb-3">
                <Search size={15} className="text-[#9E9E9E] flex-shrink-0" />
                <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
                  placeholder="Buscar fornecedor por nome..."
                  className="flex-1 outline-none text-[#212121] placeholder-[#9E9E9E] bg-transparent text-sm" />
                {supplierSearch && <button onClick={() => setSupplierSearch("")}><X size={14} className="text-[#9E9E9E]" /></button>}
              </div>

              {/* Certificados primeiro */}
              {(() => {
                const q = supplierSearch.trim().toLowerCase()
                const filtered = mirrorSuppliers.filter(s =>
                  !q || (s.company_name ?? "").toLowerCase().includes(q) || (s.city_name ?? "").toLowerCase().includes(q)
                )
                const certified  = filtered.filter(s => s.registration_type === "certified")
                const others     = filtered.filter(s => s.registration_type !== "certified")
                if (filtered.length === 0) return (
                  <div className="flex flex-col items-center gap-2 py-6 text-[#BDBDBD]">
                    <Building2 size={28} strokeWidth={1.2} />
                    <p className="text-xs text-center">Nenhum fornecedor ObraPlay encontrado na região.</p>
                  </div>
                )
                const CardMirror = ({ s }: { s: any }) => {
                  const sel = selectedSupplierIds.has(s.id)
                  return (
                    <button type="button" onClick={() => setSelectedSupplierIds(prev => {
                      const n = new Set(prev); sel ? n.delete(s.id) : n.add(s.id); return n
                    })} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-colors text-left ${sel ? "border-[#1565C0] bg-[#E3F2FD]" : "border-[#E0E0E0] bg-white"}`}>
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.company_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: getColor(s.company_name ?? "") }}>{getInitials(s.company_name ?? "")}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-[#212121] truncate">{s.company_name}</p>
                          {s.registration_type === "certified" && <span className="text-[10px] bg-[#1565C0] text-white px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">Certificado</span>}
                          {s.registration_type === "validated" && <span className="text-[10px] bg-[#E3F2FD] text-[#1565C0] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">Validado</span>}
                        </div>
                        <p className="text-xs text-[#9E9E9E] mt-0.5">{[s.city_name, s.state_abbr].filter(Boolean).join(" - ")}{s.avg_finalized_answers_duration ? ` · ${s.avg_finalized_answers_duration}` : ""}</p>
                        {(s.category_names ?? []).length > 0 && (
                          <p className="text-xs text-[#BDBDBD] mt-0.5 truncate">{s.category_names.slice(0, 3).join(", ")}</p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BDBDBD]"}`}>
                        {sel && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  )
                }
                return (
                  <>
                    {certified.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-[#1565C0]" /><p className="text-xs text-[#1565C0] font-bold uppercase tracking-wider">Certificados</p></div>
                        <div className="flex flex-col gap-2">{certified.map(s => <CardMirror key={s.id} s={s} />)}</div>
                      </div>
                    )}
                    {others.length > 0 && (
                      <div className="mb-4">
                        {certified.length > 0 && <p className="text-xs text-[#9E9E9E] font-bold uppercase tracking-wider mb-2">Outros</p>}
                        <div className="flex flex-col gap-2">{others.map(s => <CardMirror key={s.id} s={s} />)}</div>
                      </div>
                    )}
                  </>
                )
              })()}
            </>
          )}

          {/* Fornecedores adicionados manualmente */}
          <p className="text-[#616161] font-bold mb-1 mt-4 text-xs uppercase tracking-wider">CONVIDAR MANUALMENTE</p>
          <p className="text-xs text-[#9E9E9E] mb-3">Fornecedores fora da plataforma ObraPlay.</p>

          {manualSuppliers.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {manualSuppliers.map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E0E0E0] px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: getColor(s.name) }}>{getInitials(s.name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#212121] truncate">{s.name}</p>
                    <p className="text-xs text-[#9E9E9E] truncate">{[s.email, s.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button onClick={() => setManualSuppliers(prev => prev.filter((_, idx) => idx !== i))}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#FFEBEE] transition-colors flex-shrink-0">
                    <Trash2 size={14} className="text-[#E53935]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddSupplier ? (
            <div className="bg-white rounded-xl border-2 border-[#1565C0] p-4 mb-4 flex flex-col gap-3">
              <OpInput label="Nome *" value={newSupName} onChange={e => setNewSupName(e.target.value)} placeholder="Ex: Distribuidora ABC" />
              <OpInput label="E-mail" value={newSupEmail} onChange={e => setNewSupEmail(e.target.value)} placeholder="contato@fornecedor.com" type="email" />
              <OpInput label="Telefone / WhatsApp" value={newSupPhone} onChange={e => setNewSupPhone(e.target.value)} placeholder="+55 (41) 99999-0000" type="tel" />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAddSupplier(false); setNewSupName(""); setNewSupEmail(""); setNewSupPhone("") }}
                  className="flex-1 py-2.5 rounded-xl border border-[#E0E0E0] text-sm text-[#757575] font-semibold">Cancelar</button>
                <button type="button" onClick={() => {
                  if (!newSupName.trim()) { toast.error("Informe o nome."); return }
                  setManualSuppliers(prev => [...prev, { name: newSupName.trim(), email: newSupEmail.trim(), phone: newSupPhone.trim() }])
                  setNewSupName(""); setNewSupEmail(""); setNewSupPhone(""); setShowAddSupplier(false)
                }} className="flex-1 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold">Adicionar</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAddSupplier(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#BDBDBD] text-[#757575] hover:border-[#1565C0] hover:text-[#1565C0] transition-colors text-sm font-semibold mb-4">
              <Plus size={16} />Adicionar fornecedor externo
            </button>
          )}
        </div>
      )}

      {/* ─── Footer fixo ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-4 z-20" style={{ maxWidth: 480, margin: "0 auto" }}>
        {step === 3 && (isPublic || selectedSupplierIds.size > 0 || manualSuppliers.length > 0) && (
          <div className="flex items-center gap-2 mb-3 bg-[#E3F2FD] rounded-xl px-4 py-2">
            <Check size={14} className="text-[#1565C0]" />
            <span className="text-xs text-[#1565C0] font-semibold">
              {isPublic && "Pública"}
              {selectedSupplierIds.size > 0 && `${selectedSupplierIds.size} ObraPlay`}
              {manualSuppliers.length > 0 && `${manualSuppliers.length} externo${manualSuppliers.length > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !validateStep1()) return
              if (step === 2) {
                if (!validateStep2()) return
                // Busca fornecedores no mirror pelo endereço definido
                if (addressMode === "obra" && selectedObra) {
                  fetchMirrorSuppliers(selectedObra.delivery_city ?? "", selectedObra.delivery_state ?? "")
                } else if (addressMode === "manual") {
                  fetchMirrorSuppliers(manualCity, manualState)
                } else if (addressMode === "empresa") {
                  const c = companyDetail ?? activeCompany
                  fetchMirrorSuppliers((c as any)?.city ?? "", (c as any)?.state ?? "")
                }
              }
              setStep(s => s + 1)
            }}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#1255A8] transition-colors">
            Continuar
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || (!isPublic && selectedSupplierIds.size === 0 && manualSuppliers.length === 0)}
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
