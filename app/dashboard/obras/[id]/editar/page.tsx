"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2, Search, X } from "lucide-react"
import { OpInput } from "@/components/ui/op-input"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { CoverImagePicker } from "@/components/ui/cover-image-picker"

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]
const STATUS_OPTIONS = ["Orçamento","Em andamento","Pausada","Concluída","Cancelada"]
const TYPE_OPTIONS   = ["Residencial","Comercial","Industrial","Reforma","Outro"]

interface ClientOption { id: string; type: "PF" | "PJ"; full_name?: string; fantasy_name?: string; company_name?: string }

interface FormState {
  name: string; status: string; type: string; area_m2: string
  start_date: string; expected_end_date: string
  is_own: boolean; client_id: string
  delivery_zipcode: string; delivery_street: string; delivery_number: string
  delivery_complement: string; delivery_neighbourhood: string; delivery_city: string; delivery_state: string
  same_billing_address: boolean
  billing_zipcode: string; billing_street: string; billing_number: string
  billing_complement: string; billing_neighbourhood: string; billing_city: string; billing_state: string
  notes: string; cover_url: string; cover_position: string
}

const EMPTY: FormState = {
  name: "", status: "Orçamento", type: "", area_m2: "", start_date: "", expected_end_date: "",
  is_own: false, client_id: "",
  delivery_zipcode: "", delivery_street: "", delivery_number: "", delivery_complement: "",
  delivery_neighbourhood: "", delivery_city: "", delivery_state: "",
  same_billing_address: true,
  billing_zipcode: "", billing_street: "", billing_number: "", billing_complement: "",
  billing_neighbourhood: "", billing_city: "", billing_state: "", notes: "", cover_url: "", cover_position: "50% 50%",
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#616161] font-bold mt-6 mb-3 border-b border-[#EEEEEE] pb-1.5" style={{ fontSize: "0.82rem", letterSpacing: "0.1em" }}>
      {children}
    </p>
  )
}

export default function EditarObraPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { activeCompany } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [cepLoading, setCepLoading] = useState(false)

  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdown, setClientDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)

  // Carrega dados da obra
  useEffect(() => {
    if (!id) return
    authFetch(`/api/obras/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({
          name: d.name ?? "",
          status: d.status ?? "Orçamento",
          type: d.type ?? "",
          area_m2: d.area_m2 != null ? String(d.area_m2) : "",
          start_date: d.start_date ? d.start_date.slice(0, 10) : "",
          expected_end_date: d.expected_end_date ? d.expected_end_date.slice(0, 10) : "",
          is_own: d.is_own ?? false,
          client_id: d.client_id ?? "",
          delivery_zipcode: d.delivery_zipcode ?? "",
          delivery_street: d.delivery_street ?? "",
          delivery_number: d.delivery_number ?? "",
          delivery_complement: d.delivery_complement ?? "",
          delivery_neighbourhood: d.delivery_neighbourhood ?? "",
          delivery_city: d.delivery_city ?? "",
          delivery_state: d.delivery_state ?? "",
          same_billing_address: d.same_billing_address ?? true,
          billing_zipcode: d.billing_zipcode ?? "",
          billing_street: d.billing_street ?? "",
          billing_number: d.billing_number ?? "",
          billing_complement: d.billing_complement ?? "",
          billing_neighbourhood: d.billing_neighbourhood ?? "",
          billing_city: d.billing_city ?? "",
          billing_state: d.billing_state ?? "",
          notes: d.notes ?? "",
          cover_url: d.cover_url ?? "",
          cover_position: d.cover_position ?? "50% 50%",
        })
        if (d.client_id && d.client_name) {
          setSelectedClient({ id: d.client_id, type: d.client_type ?? "PF", full_name: d.client_name })
        }
      })
      .catch(() => toast.error("Erro ao carregar obra"))
      .finally(() => setFetchLoading(false))
  }, [id])

  useEffect(() => {
    if (!activeCompany?.id) return
    authFetch(`/api/clientes?company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [activeCompany?.id])

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => normalize(c.full_name ?? c.fantasy_name ?? c.company_name ?? "").includes(normalize(clientSearch)))
    : clients.slice(0, 8)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  const syncBilling = useCallback((deliveryFields: Partial<FormState>) => {
    if (form.same_billing_address) {
      setForm((p) => ({
        ...p, ...deliveryFields,
        billing_zipcode: deliveryFields.delivery_zipcode ?? p.delivery_zipcode,
        billing_street: deliveryFields.delivery_street ?? p.delivery_street,
        billing_number: deliveryFields.delivery_number ?? p.delivery_number,
        billing_complement: deliveryFields.delivery_complement ?? p.delivery_complement,
        billing_neighbourhood: deliveryFields.delivery_neighbourhood ?? p.delivery_neighbourhood,
        billing_city: deliveryFields.delivery_city ?? p.delivery_city,
        billing_state: deliveryFields.delivery_state ?? p.delivery_state,
      }))
    } else {
      setForm((p) => ({ ...p, ...deliveryFields }))
    }
  }, [form.same_billing_address])

  async function fetchCep(raw: string, type: "delivery" | "billing") {
    const digits = raw.replace(/\D/g, "")
    const formatted = digits.length <= 5 ? digits : `${digits.slice(0,5)}-${digits.slice(5,8)}`
    if (type === "delivery") syncBilling({ delivery_zipcode: formatted })
    else set("billing_zipcode", formatted)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const json = await res.json()
      if (json.erro) throw new Error()
      if (type === "delivery") {
        syncBilling({ delivery_zipcode: formatted, delivery_street: json.logradouro ?? "", delivery_neighbourhood: json.bairro ?? "", delivery_city: json.localidade ?? "", delivery_state: json.uf ?? "", delivery_complement: json.complemento ?? "" })
      } else {
        setForm((p) => ({ ...p, billing_street: json.logradouro ?? "", billing_neighbourhood: json.bairro ?? "", billing_city: json.localidade ?? "", billing_state: json.uf ?? "" }))
      }
      toast.success("CEP preenchido automaticamente")
    } catch { toast.error("CEP não encontrado") }
    finally { setCepLoading(false) }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Nome da obra obrigatório"
    if (!form.is_own && !form.client_id) e.client_id = "Selecione um cliente ou marque como obra própria"
    setErrors(e)
    if (e.client_id) toast.error("Vincule um cliente ou marque a obra como própria para continuar.")
    else if (e.name) toast.error("Informe o nome da obra para continuar.")
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/obras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.is_own ? null : form.client_id || null,
          is_own: form.is_own, name: form.name.trim(), status: form.status,
          type: form.type || null, area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
          start_date: form.start_date || null, expected_end_date: form.expected_end_date || null,
          delivery_zipcode: form.delivery_zipcode || null, delivery_street: form.delivery_street || null,
          delivery_number: form.delivery_number || null, delivery_complement: form.delivery_complement || null,
          delivery_neighbourhood: form.delivery_neighbourhood || null, delivery_city: form.delivery_city || null,
          delivery_state: form.delivery_state || null, same_billing_address: form.same_billing_address,
          billing_zipcode: form.same_billing_address ? form.delivery_zipcode || null : form.billing_zipcode || null,
          billing_street: form.same_billing_address ? form.delivery_street || null : form.billing_street || null,
          billing_number: form.same_billing_address ? form.delivery_number || null : form.billing_number || null,
          billing_complement: form.same_billing_address ? form.delivery_complement || null : form.billing_complement || null,
          billing_neighbourhood: form.same_billing_address ? form.delivery_neighbourhood || null : form.billing_neighbourhood || null,
          billing_city: form.same_billing_address ? form.delivery_city || null : form.billing_city || null,
          billing_state: form.same_billing_address ? form.delivery_state || null : form.billing_state || null,
          notes: form.notes || null, cover_url: form.cover_url || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      toast.success("Obra atualizada com sucesso!")
      router.push(`/dashboard/obras/${id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0" style={{ height: 52 }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors" aria-label="Voltar">
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Editar obra</span>
      </div>

      <form id="obra-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto" style={{ padding: "0 16px" }}>

        {/* Foto de capa */}
        <SectionLabel>FOTO DE CAPA</SectionLabel>
        <CoverImagePicker
          value={form.cover_url}
          objectPosition={form.cover_position}
          onChange={(url) => set("cover_url", url)}
          onPositionChange={(pos) => set("cover_position", pos)}
        />

        {/* Identificação */}
        <SectionLabel>IDENTIFICAÇÃO</SectionLabel>
        <OpInput label="Nome da obra*" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Reforma Residencial Silva" error={errors.name} />

        <div className="flex items-center justify-between py-3 border-b border-[#EEEEEE]">
          <div>
            <p className="text-sm font-medium text-[#212121]">Obra própria</p>
            <p className="text-xs text-[#9E9E9E]">Sem cliente vinculado</p>
          </div>
          <button type="button" role="switch" aria-checked={form.is_own}
            onClick={() => { set("is_own", !form.is_own); if (!form.is_own) { set("client_id", ""); setSelectedClient(null); setClientSearch("") } }}
            className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.is_own ? "bg-[#1565C0]" : "bg-[#BDBDBD]"}`}>
            <span className={`absolute top-0.5 bottom-0.5 aspect-square bg-white rounded-full shadow-sm transition-all duration-200 ${form.is_own ? "left-[calc(100%-1.25rem-2px)]" : "left-[2px]"}`} />
          </button>
        </div>

        {!form.is_own && (
          <div className="mt-3">
            <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Cliente*</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-[#F5F7FF] rounded-lg px-3 py-2.5 border border-[#1565C0]">
                <div>
                  <p className="text-sm font-medium text-[#212121]">{selectedClient.full_name ?? selectedClient.fantasy_name ?? selectedClient.company_name}</p>
                  <p className="text-xs text-[#9E9E9E]">{selectedClient.type}</p>
                </div>
                <button type="button" onClick={() => { setSelectedClient(null); set("client_id", ""); setClientSearch("") }}>
                  <X size={16} className="text-[#9E9E9E]" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-[#E0E0E0] rounded-lg px-3 py-2.5 focus-within:border-[#1565C0] transition-colors">
                  <Search size={15} className="text-[#9E9E9E]" />
                  <input className="flex-1 outline-none text-sm text-[#212121] placeholder:text-[#9E9E9E] bg-transparent"
                    placeholder="Buscar cliente..." value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setClientDropdown(true) }}
                    onFocus={() => setClientDropdown(true)}
                    onBlur={() => setTimeout(() => setClientDropdown(false), 150)} />
                </div>
                {clientDropdown && filteredClients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 bg-white rounded-xl shadow-lg border border-[#E0E0E0] overflow-hidden mt-1 max-h-48 overflow-y-auto">
                    {filteredClients.map((c) => {
                      const name = c.full_name ?? c.fantasy_name ?? c.company_name
                      return (
                        <button key={c.id} type="button"
                          onMouseDown={() => { setSelectedClient(c); set("client_id", c.id); setClientSearch(""); setClientDropdown(false) }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F5F7FF] transition-colors border-b border-[#F5F5F5] last:border-0 text-left">
                          <span className="text-sm text-[#212121]">{name}</span>
                          <span className="text-xs text-[#9E9E9E] ml-2">{c.type}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {errors.client_id && <p className="text-xs text-red-500 mt-1">{errors.client_id}</p>}
          </div>
        )}

        <SectionLabel>DETALHES</SectionLabel>
        <div className="mb-3">
          <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="op-input-underline w-full">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Tipo de obra</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className="op-input-underline w-full">
            <option value="">Selecione</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <OpInput label="Área (m²)" value={form.area_m2} type="number" onChange={(e) => set("area_m2", e.target.value)} placeholder="0,00" />
        <div className="flex gap-4 mt-1">
          <div className="flex-1">
            <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Data de início</label>
            <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="op-input-underline w-full" />
          </div>
          <div className="flex-1">
            <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Previsão de conclusão</label>
            <input type="date" value={form.expected_end_date} onChange={(e) => set("expected_end_date", e.target.value)} className="op-input-underline w-full" />
          </div>
        </div>

        <SectionLabel>ENDEREÇO DE ENTREGA</SectionLabel>
        <OpInput label="CEP" value={form.delivery_zipcode} onChange={(e) => fetchCep(e.target.value, "delivery")} placeholder="00000-000"
          suffix={cepLoading ? <Loader2 size={14} className="animate-spin text-[#1565C0]" /> : undefined} />
        <OpInput label="Logradouro" value={form.delivery_street} onChange={(e) => syncBilling({ delivery_street: e.target.value })} placeholder="Rua, Avenida..." />
        <div className="flex gap-4">
          <div className="flex-1"><OpInput label="Número" value={form.delivery_number} onChange={(e) => syncBilling({ delivery_number: e.target.value })} placeholder="Nº" /></div>
          <div className="flex-1"><OpInput label="Complemento" value={form.delivery_complement} onChange={(e) => syncBilling({ delivery_complement: e.target.value })} placeholder="Apto..." /></div>
        </div>
        <OpInput label="Bairro" value={form.delivery_neighbourhood} onChange={(e) => syncBilling({ delivery_neighbourhood: e.target.value })} placeholder="Bairro" />
        <div className="flex gap-4">
          <div className="flex-1"><OpInput label="Cidade" value={form.delivery_city} onChange={(e) => syncBilling({ delivery_city: e.target.value })} placeholder="Cidade" /></div>
          <div className="flex-1">
            <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Estado</label>
            <select value={form.delivery_state} onChange={(e) => syncBilling({ delivery_state: e.target.value })} className="op-input-underline w-full">
              <option value="">UF</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <SectionLabel>ENDEREÇO DE COBRANÇA</SectionLabel>
        <label className="flex items-center gap-2 py-2 cursor-pointer mb-3">
          <input type="checkbox" checked={form.same_billing_address}
            onChange={(e) => {
              const v = e.target.checked
              set("same_billing_address", v)
              if (v) setForm((p) => ({ ...p, same_billing_address: true, billing_zipcode: p.delivery_zipcode, billing_street: p.delivery_street, billing_number: p.delivery_number, billing_complement: p.delivery_complement, billing_neighbourhood: p.delivery_neighbourhood, billing_city: p.delivery_city, billing_state: p.delivery_state }))
            }}
            className="w-4 h-4 rounded accent-[#1565C0]" />
          <span className="text-sm text-[#424242]">Usar mesmo endereço como cobrança</span>
        </label>

        {!form.same_billing_address && (
          <>
            <OpInput label="CEP" value={form.billing_zipcode} onChange={(e) => fetchCep(e.target.value, "billing")} placeholder="00000-000" />
            <OpInput label="Logradouro" value={form.billing_street} onChange={(e) => set("billing_street", e.target.value)} placeholder="Rua, Avenida..." />
            <div className="flex gap-4">
              <div className="flex-1"><OpInput label="Número" value={form.billing_number} onChange={(e) => set("billing_number", e.target.value)} placeholder="Nº" /></div>
              <div className="flex-1"><OpInput label="Complemento" value={form.billing_complement} onChange={(e) => set("billing_complement", e.target.value)} placeholder="Apto..." /></div>
            </div>
            <OpInput label="Bairro" value={form.billing_neighbourhood} onChange={(e) => set("billing_neighbourhood", e.target.value)} placeholder="Bairro" />
            <div className="flex gap-4">
              <div className="flex-1"><OpInput label="Cidade" value={form.billing_city} onChange={(e) => set("billing_city", e.target.value)} placeholder="Cidade" /></div>
              <div className="flex-1">
                <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Estado</label>
                <select value={form.billing_state} onChange={(e) => set("billing_state", e.target.value)} className="op-input-underline w-full">
                  <option value="">UF</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <SectionLabel>OBSERVAÇÕES</SectionLabel>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anotações sobre a obra..." rows={3}
          className="w-full border border-[#E0E0E0] rounded-lg resize-none outline-none text-[#212121] placeholder:text-[#9E9E9E] transition-colors focus:border-[#1565C0] mb-6"
          style={{ fontSize: "0.875rem", padding: "10px 12px" }} />
      </form>

      <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE]" style={{ padding: "12px 16px 20px" }}>
        <button type="submit" form="obra-form" disabled={loading} className="op-btn-primary">
          {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Salvando...</> : "SALVAR ALTERAÇÕES"}
        </button>
      </div>
    </div>
  )
}
