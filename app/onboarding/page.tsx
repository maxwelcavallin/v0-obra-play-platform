"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

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
  stateRegistration: string
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
  const [confirmed, setConfirmed] = useState(false)

  async function fetchCNPJ() {
    const digits = data.cnpj.replace(/\D/g, "")
    if (digits.length !== 14) { toast.error("CNPJ incompleto"); return }
    setLoadingCNPJ(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      onChange({
        companyName: "Tosel Materiais de Construção LTDA",
        fantasyName: "Tosel",
        stateRegistration: "1121543.1248.127",
      })
      setConfirmed(true)
      toast.success("Dados do CNPJ preenchidos")
    } catch {
      toast.error("CNPJ não encontrado")
    } finally {
      setLoadingCNPJ(false)
    }
  }

  // Após busca, mostrar tela de confirmação dos dados
  if (confirmed && data.companyName) {
    return (
      <div className="flex flex-col gap-0">
        <SectionLabel>Confirme os dados</SectionLabel>
        <div className="flex flex-col">
          {[
            { label: "CNPJ", value: data.cnpj },
            { label: "Razão Social", value: data.companyName },
            { label: "Nome fantasia", value: data.fantasyName },
            { label: "Inscrição estadual", value: data.stateRegistration },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3 border-b border-[#EEEEEE]">
              <span className="text-sm text-[#9E9E9E]">{row.label}</span>
              <span className="text-sm text-[#212121] font-medium text-right max-w-[55%]">{row.value}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          className="text-sm text-[#1565C0] mt-4 text-left"
        >
          Editar dados
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionLabel>Informe o CNPJ</SectionLabel>
      <div>
        <UInput
          placeholder="CNPJ"
          value={data.cnpj}
          onChange={(v) => onChange({ cnpj: formatCNPJ(v) })}
          hasError={!!errors.cnpj}
        />
        <FieldError msg={errors.cnpj} />
      </div>
      <div>
        <UInput
          placeholder="Razão Social"
          value={data.companyName}
          onChange={(v) => onChange({ companyName: v })}
        />
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
      {/* Botão buscar inline */}
      <button
        type="button"
        onClick={fetchCNPJ}
        disabled={loadingCNPJ || data.cnpj.replace(/\D/g, "").length !== 14}
        className="self-start flex items-center gap-2 text-sm font-semibold text-[#1565C0] disabled:opacity-40"
      >
        {loadingCNPJ && <Loader2 size={14} className="animate-spin" />}
        Buscar CNPJ
      </button>
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
  function addCity() {
    if (!data.cityInput.trim()) return
    onChange({
      cities: [...data.cities, data.cityInput.trim()],
      cityInput: "",
    })
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

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={data.cityInput}
              onChange={(e) => onChange({ cityInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCity() } }}
              placeholder="Pesquise..."
              className="op-input-underline"
            />
          </div>
          <button
            type="button"
            onClick={addCity}
            className="text-sm font-semibold text-[#1565C0] pb-2.5 flex-shrink-0"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Foto de perfil */}
      <div>
        <p className="text-sm text-[#212121] font-medium mb-3">Foto de perfil do negócio</p>
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#EEEEEE] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-[#E0E0E0] flex items-center justify-center shadow-sm"
              aria-label="Adicionar foto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
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
    cnpj: "", companyName: "", fantasyName: "", stateRegistration: "",
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
      {/* Sub-header com seta + título centralizado */}
      <header className="op-subheader border-b border-[#EEEEEE]">
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
