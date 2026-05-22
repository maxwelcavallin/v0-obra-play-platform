"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import { searchCidades, type CidadeBR } from "@/lib/cidades-br"

// --- Masks ---
function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return v
}

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]

// --- Sub-input component (underline style) ---
function UInput({
  placeholder,
  value,
  onChange,
  type = "text",
  hasError = false,
  className = "",
  children,
}: {
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  hasError?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`op-input-underline ${hasError ? "op-input-error" : ""}`}
      />
      {children}
    </div>
  )
}

// --- Section label ---
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-medium text-[#9E9E9E] mb-3">{children}</p>
  )
}

// --- Field error ---
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-[#F44336] text-xs mt-1">{msg}</p>
}

// ===== STEP 1: Informe o CNPJ (passo 1/3) =====
interface Step1Data {
  cnpj: string
  companyName: string
  fantasyName: string
  logo?: string
}

function Step1({
  data,
  onChange,
  errors,
}: {
  data: Step1Data
  onChange: (d: Partial<Step1Data>) => void
  errors: Record<string, string>
}) {
  const [loadingCNPJ, setLoadingCNPJ] = useState(false)

  async function handleCNPJChange(raw: string) {
    const formatted = formatCNPJ(raw)
    onChange({ cnpj: formatted })
    const digits = formatted.replace(/\D/g, "")
    if (digits.length !== 14) return
    setLoadingCNPJ(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      onChange({
        companyName: json.razao_social ?? "",
        fantasyName: json.nome_fantasia || json.razao_social || "",
      })
      toast.success("Dados do CNPJ preenchidos automaticamente")
    } catch {
      toast.error("CNPJ não encontrado na Receita Federal")
    } finally {
      setLoadingCNPJ(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionLabel>Informe o CNPJ</SectionLabel>

      <div>
        <div className="relative">
          <UInput
            placeholder="CNPJ"
            value={data.cnpj}
            onChange={(v) => handleCNPJChange(v)}
            hasError={!!errors.cnpj}
          />
          {loadingCNPJ && (
            <Loader2 size={15} className="animate-spin text-[#1565C0] absolute right-0 top-1/2 -translate-y-1/2" />
          )}
        </div>
        <FieldError msg={errors.cnpj} />
      </div>
      <div>
        <UInput
          placeholder="Razão Social"
          value={data.companyName}
          onChange={(v) => onChange({ companyName: v })}
        />
        <p className="text-[#9E9E9E] mt-0.5" style={{ fontSize: "0.7rem" }}>
          Preenchido automaticamente pelo CNPJ
        </p>
      </div>
      <div>
        <UInput
          placeholder="Nome Fantasia"
          value={data.fantasyName}
          onChange={(v) => onChange({ fantasyName: v })}
          hasError={!!errors.fantasyName}
        />
        <FieldError msg={errors.fantasyName} />
      </div>
    </div>
  )
}

// ===== STEP 2: Endereço (passo 2/3) =====
interface Step2Data {
  zipcode: string
  street: string
  number: string
  complement: string
  neighbourhood: string
  city: string
  state: string
}

function Step2({
  data,
  onChange,
  errors,
}: {
  data: Step2Data
  onChange: (d: Partial<Step2Data>) => void
  errors: Record<string, string>
}) {
  const [loadingCEP, setLoadingCEP] = useState(false)

  async function fetchCEP() {
    const digits = data.zipcode.replace(/\D/g, "")
    if (digits.length !== 8) { toast.error("CEP incompleto"); return }
    setLoadingCEP(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const json = await res.json()
      if (json.erro) { toast.error("CEP não encontrado"); return }
      onChange({
        street: json.logradouro,
        neighbourhood: json.bairro,
        city: json.localidade,
        state: json.uf,
      })
      toast.success("Endereço preenchido automaticamente")
    } catch {
      toast.error("Erro ao buscar CEP")
    } finally {
      setLoadingCEP(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionLabel>Informe o endereço</SectionLabel>

      {/* CEP */}
      <div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <UInput
              placeholder="CEP"
              value={data.zipcode}
              onChange={(v) => onChange({ zipcode: formatCEP(v) })}
              hasError={!!errors.zipcode}
            />
          </div>
          <button
            type="button"
            onClick={fetchCEP}
            disabled={loadingCEP || data.zipcode.replace(/\D/g, "").length !== 8}
            className="text-sm font-semibold text-[#1565C0] pb-2.5 flex-shrink-0 disabled:opacity-40 flex items-center gap-1"
          >
            {loadingCEP && <Loader2 size={14} className="animate-spin" />}
            Buscar
          </button>
        </div>
        <FieldError msg={errors.zipcode} />
      </div>

      <div>
        <UInput
          placeholder="Logradouro"
          value={data.street}
          onChange={(v) => onChange({ street: v })}
          hasError={!!errors.street}
        />
        <FieldError msg={errors.street} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <UInput
            placeholder="Número"
            value={data.number}
            onChange={(v) => onChange({ number: v })}
            hasError={!!errors.number}
          />
          <FieldError msg={errors.number} />
        </div>
        <div className="flex-1">
          <UInput
            placeholder="Complemento"
            value={data.complement}
            onChange={(v) => onChange({ complement: v })}
          />
        </div>
      </div>

      <div>
        <UInput
          placeholder="Bairro"
          value={data.neighbourhood}
          onChange={(v) => onChange({ neighbourhood: v })}
          hasError={!!errors.neighbourhood}
        />
        <FieldError msg={errors.neighbourhood} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <UInput
            placeholder="Cidade"
            value={data.city}
            onChange={(v) => onChange({ city: v })}
            hasError={!!errors.city}
          />
          <FieldError msg={errors.city} />
        </div>
        <div className="w-20">
          <select
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
            className={`op-input-underline ${errors.state ? "op-input-error" : ""}`}
          >
            <option value="">UF</option>
            {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldError msg={errors.state} />
        </div>
      </div>
    </div>
  )
}

// ===== STEP 3: Contatos (passo 3/3) =====
interface Step3Data {
  whatsapp: string
  email: string
  cities: string[]
  cityInput: string
}

function Step3({
  data,
  onChange,
  errors,
}: {
  data: Step3Data
  onChange: (d: Partial<Step3Data>) => void
  errors: Record<string, string>
}) {
  const [suggestions, setSuggestions] = useState<CidadeBR[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  function handleCityInput(v: string) {
    onChange({ cityInput: v })
    if (v.trim().length >= 2) {
      setSuggestions(searchCidades(v, 8))
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function selectCity(label: string) {
    if (data.cities.includes(label)) return
    onChange({ cities: [...data.cities, label], cityInput: "" })
    setSuggestions([])
    setShowSuggestions(false)
  }

  function addCityFromInput() {
    const v = data.cityInput.trim()
    if (!v) return
    if (data.cities.includes(v)) { onChange({ cityInput: "" }); return }
    onChange({ cities: [...data.cities, v], cityInput: "" })
    setSuggestions([])
    setShowSuggestions(false)
  }

  function removeCity(idx: number) {
    onChange({ cities: data.cities.filter((_, i) => i !== idx) })
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionLabel>Informe os dados de contato</SectionLabel>

      <div>
        <UInput
          placeholder="WhatsApp do negócio"
          value={data.whatsapp}
          onChange={(v) => onChange({ whatsapp: formatPhone(v) })}
          hasError={!!errors.whatsapp}
          type="tel"
        />
        <FieldError msg={errors.whatsapp} />
      </div>

      <div>
        <UInput
          placeholder="E-mail"
          value={data.email}
          onChange={(v) => onChange({ email: v })}
          hasError={!!errors.email}
          type="email"
        />
        <FieldError msg={errors.email} />
      </div>

      {/* Locais de atuação */}
      <div>
        <p className="text-sm text-[#212121] font-medium mb-1">Locais de atuação</p>
        <p className="text-xs text-[#9E9E9E] mb-2">Nome da cidade, estado ou região que atua</p>

        {/* Chips de cidades */}
        {data.cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {data.cities.map((city, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5F5F5] text-sm text-[#212121] border border-[#E0E0E0]"
              >
                {city}
                <button
                  type="button"
                  onClick={() => removeCity(idx)}
                  className="text-[#9E9E9E] hover:text-[#F44336] ml-0.5"
                  aria-label={`Remover ${city}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={data.cityInput}
                onChange={(e) => handleCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCityFromInput() }
                  if (e.key === "Escape") { setShowSuggestions(false) }
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Digite uma cidade ou estado..."
                className="op-input-underline"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={addCityFromInput}
              className="text-sm font-semibold text-[#1565C0] pb-2.5 flex-shrink-0"
            >
              Adicionar
            </button>
          </div>

          {/* Dropdown de sugestões */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 bg-white rounded-xl shadow-lg border border-[#E0E0E0] overflow-hidden mt-1">
              {suggestions.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onMouseDown={() => selectCity(c.label)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F5F7FF] transition-colors border-b border-[#F5F5F5] last:border-b-0"
                >
                  <span className="text-sm text-[#212121]">{c.cidade}</span>
                  <span className="text-xs text-[#9E9E9E] ml-2 flex-shrink-0">{c.estado}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ===== MAIN PAGE =====
export default function OnboardingPage() {
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [step1, setStep1] = useState<Step1Data>({
    cnpj: "", companyName: "", fantasyName: "", logo: undefined,
  })
  const [step2, setStep2] = useState<Step2Data>({
    zipcode: "", street: "", number: "", complement: "", neighbourhood: "", city: "", state: "",
  })
  const [step3, setStep3] = useState<Step3Data>({
    whatsapp: "", email: "", cities: [], cityInput: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const TOTAL_STEPS = 3
  const progressPct = (step / TOTAL_STEPS) * 100

  const stepTitles = [
    "Configure seu negócio",
    "Configure seu negócio",
    "Configure seu negócio",
  ]

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!step1.cnpj || step1.cnpj.replace(/\D/g, "").length !== 14) errs.cnpj = "CNPJ inválido"
    if (!step1.fantasyName.trim()) errs.fantasyName = "Nome Fantasia obrigatório"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {}
    if (!step2.zipcode || step2.zipcode.replace(/\D/g, "").length !== 8) errs.zipcode = "CEP inválido"
    if (!step2.street.trim()) errs.street = "Logradouro obrigatório"
    if (!step2.number.trim()) errs.number = "Número obrigatório"
    if (!step2.neighbourhood.trim()) errs.neighbourhood = "Bairro obrigatório"
    if (!step2.city.trim()) errs.city = "Cidade obrigatória"
    if (!step2.state) errs.state = "UF obrigatório"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep3(): boolean {
    const errs: Record<string, string> = {}
    if (!step3.email) errs.email = "E-mail obrigatório"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step3.email)) errs.email = "E-mail inválido"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    setErrors({})
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  async function handleFinish() {
    if (!validateStep3()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    completeOnboarding({
      id: `cmp-${Date.now()}`,
      fantasyName: step1.fantasyName,
      companyName: step1.companyName || step1.fantasyName,
      cnpj: step1.cnpj,
      city: step2.city,
      state: step2.state,
    })
    toast.success("Empresa criada com sucesso! Bem-vindo ao Obra Play!")
    router.push("/dashboard")
    setLoading(false)
  }

  return (
    <main className="min-h-dvh bg-white flex flex-col">
      {/* Sub-header com seta + título centralizado — height 52px conforme HTML */}
      <header className="op-subheader border-b border-[#EEEEEE]" style={{ height: 52 }}>
        {step > 1 && (
          <button
            onClick={() => { setErrors({}); setStep((s) => s - 1) }}
            className="absolute left-4 flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#F5F5F5] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
        )}
        <span className="op-subheader-title">{stepTitles[step - 1]}</span>
      </header>

      {/* Barra de progresso fina */}
      <div className="op-progress-bar-track">
        <div className="op-progress-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 px-6 pt-8 pb-28 overflow-y-auto">
        {step === 1 && (
          <Step1
            data={step1}
            onChange={(d) => setStep1((p) => ({ ...p, ...d }))}
            errors={errors}
          />
        )}
        {step === 2 && (
          <Step2
            data={step2}
            onChange={(d) => setStep2((p) => ({ ...p, ...d }))}
            errors={errors}
          />
        )}
        {step === 3 && (
          <Step3
            data={step3}
            onChange={(d) => setStep3((p) => ({ ...p, ...d }))}
            errors={errors}
          />
        )}
      </div>

      {/* Botão fixo na base */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-3 border-t border-[#EEEEEE]">
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="op-btn-primary"
          >
            PRÓXIMO
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={loading}
            className="op-btn-primary"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Concluindo...</>
            ) : (
              <>
                <CheckCircle size={18} />
                CADASTRAR
              </>
            )}
          </button>
        )}
      </div>
    </main>
  )
}
