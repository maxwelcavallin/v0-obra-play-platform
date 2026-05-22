"use client"

import { useState, useRef } from "react"
import { Camera, Info, Globe, Instagram, Mail, Loader2 } from "lucide-react"
import { OpInput } from "@/components/ui/op-input"
import { fmtCNPJ, fmtPhone, fmtCEP, type CompanyMock } from "@/lib/mock-data"
import { toast } from "sonner"

type FormData = Omit<CompanyMock, "id" | "role">

interface EmpresaFormProps {
  initial?: Partial<FormData>
  onSave: (data: FormData) => void
  loading?: boolean
  submitLabel?: string
}

const TABS = ["Geral", "Endereço", "Contato"] as const
type Tab = typeof TABS[number]

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const EMPTY: FormData = {
  fantasyName: "", companyName: "", cnpj: "", stateRegistration: "", city: "", state: "",
  logoUrl: undefined,
  cep: "", address: "", number: "", complement: "", neighborhood: "",
  whatsapp: "", email: "", instagram: "", website: "",
}

export function EmpresaForm({ initial = {}, onSave, loading, submitLabel = "SALVAR" }: EmpresaFormProps) {
  const [tab, setTab] = useState<Tab>("Geral")
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  function update(key: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  async function handleCnpjChange(raw: string) {
    const formatted = fmtCNPJ(raw)
    update("cnpj", formatted)
    const digits = formatted.replace(/\D/g, "")
    if (digits.length !== 14) return
    setCnpjLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setForm((p) => ({
        ...p,
        companyName: json.razao_social ?? p.companyName,
        fantasyName: json.nome_fantasia || json.razao_social || p.fantasyName,
      }))
      toast.success("Dados do CNPJ preenchidos automaticamente")
    } catch {
      toast.error("CNPJ não encontrado na Receita Federal")
    } finally {
      setCnpjLoading(false)
    }
  }

  async function handleCepChange(raw: string) {
    const formatted = fmtCEP(raw)
    update("cep", formatted)
    const digits = formatted.replace(/\D/g, "")
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      if (json.erro) throw new Error()
      setForm((p) => ({
        ...p,
        address: json.logradouro ?? p.address,
        neighborhood: json.bairro ?? p.neighborhood,
        city: json.localidade ?? p.city,
        state: json.uf ?? p.state,
        complement: json.complemento || p.complement,
      }))
      toast.success("Endereço preenchido automaticamente")
    } catch {
      toast.error("CEP não encontrado")
    } finally {
      setCepLoading(false)
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => update("logoUrl", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.fantasyName.trim()) e.fantasyName = "Nome fantasia obrigatório"
    if (!form.cnpj.trim()) e.cnpj = "CNPJ obrigatório"
    if (!form.whatsapp.trim()) e.whatsapp = "WhatsApp obrigatório"
    if (!form.email.trim()) e.email = "E-mail obrigatório"
    setErrors(e)
    if (Object.keys(e).length > 0) {
      if (e.fantasyName || e.cnpj) setTab("Geral")
      else if (e.whatsapp || e.email) setTab("Contato")
    }
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  return (
    <form id="empresa-form" onSubmit={handleSubmit} noValidate className="flex flex-col flex-1">

      {/* Tabs */}
      <div className="flex border-b border-[#EEEEEE] bg-white flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === t ? "text-[#1565C0]" : "text-[#757575] hover:text-[#424242]"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1565C0] rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Conteudo scrollavel */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "20px 16px 0" }}>

        {/* ── Geral ── */}
        {tab === "Geral" && (
          <div className="flex flex-col gap-1">

            {/* Upload de logo */}
            <div className="flex flex-col items-center gap-1 mb-4">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full bg-[#EEEEEE] border-2 border-dashed border-[#BDBDBD] flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => logoRef.current?.click()}
                >
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9E9E9E] font-bold text-2xl">
                      {(form.fantasyName?.[0] ?? "E").toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1565C0] flex items-center justify-center shadow-md border-2 border-white"
                  aria-label="Alterar logo"
                >
                  <Camera size={13} className="text-white" />
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
              <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>Logo da empresa</p>
            </div>

            <div className="relative">
              <OpInput
                label="CNPJ*"
                value={form.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                error={errors.cnpj}
                suffix={cnpjLoading ? <Loader2 size={15} className="animate-spin text-[#1565C0]" /> : undefined}
              />
            </div>
            <OpInput label="Razão social" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Preenchido automaticamente pelo CNPJ" />
            <OpInput label="Nome fantasia*" value={form.fantasyName} onChange={(e) => update("fantasyName", e.target.value)} placeholder="Como a empresa é conhecida" error={errors.fantasyName} />
          </div>
        )}

        {/* ── Endereço ── */}
        {tab === "Endereço" && (
          <div className="flex flex-col gap-1">
            <OpInput
              label="CEP"
              value={form.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              suffix={cepLoading ? <Loader2 size={15} className="animate-spin text-[#1565C0]" /> : undefined}
            />
            <OpInput label="Logradouro" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua, Avenida..." />
            <div className="flex gap-4">
              <div className="flex-1"><OpInput label="Número" value={form.number} onChange={(e) => update("number", e.target.value)} placeholder="Nº" /></div>
              <div className="flex-1"><OpInput label="Complemento" value={form.complement} onChange={(e) => update("complement", e.target.value)} placeholder="Sala, Apto..." /></div>
            </div>
            <OpInput label="Bairro" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="Bairro" />
            <OpInput label="Cidade" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Cidade" />
            <div>
              <label className="text-[#9E9E9E] block" style={{ fontSize: "0.75rem", marginBottom: 2 }}>Estado</label>
              <select
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="op-input-underline"
                style={{ appearance: "none" }}
              >
                <option value="">Selecione</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Contato ── */}
        {tab === "Contato" && (
          <div className="flex flex-col gap-1">
            <OpInput
              label="WhatsApp*"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", fmtPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              error={errors.whatsapp}
              suffix={<span style={{ fontSize: "0.7rem", color: "#25D366", fontWeight: 700 }}>WA</span>}
            />
            <OpInput
              label="E-mail de contato*"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contato@empresa.com"
              error={errors.email}
              suffix={<Mail size={15} className="text-[#9E9E9E]" />}
            />
            <OpInput
              label="Instagram"
              value={form.instagram}
              onChange={(e) => update("instagram", e.target.value.replace(/^@/, ""))}
              placeholder="suaempresa"
              inputPrefix={<span className="text-[#9E9E9E] pr-1" style={{ fontSize: "1rem" }}>@</span>}
              suffix={<Instagram size={15} className="text-[#9E9E9E]" />}
            />
            <OpInput
              label="Website"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="www.suaempresa.com.br"
              suffix={<Globe size={15} className="text-[#9E9E9E]" />}
            />
            <div className="op-info-box mt-3">
              <Info size={14} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
              <span>Essas informações são usadas pelos fornecedores para entrar em contato com sua empresa.</span>
            </div>
          </div>
        )}
      </div>

      {/* Botao fixo no rodape */}
      <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE]" style={{ padding: "12px 16px 20px" }}>
        <button type="submit" form="empresa-form" disabled={loading} className="op-btn-primary">
          {loading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  )
}
