"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HardHat, Loader2, ArrowLeft, CheckCircle, Building2, MapPin, Phone } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

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

// Step indicator component
function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: "Empresa", icon: Building2 },
    { label: "Endereço", icon: MapPin },
    { label: "Contatos", icon: Phone },
  ]
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => {
        const num = idx + 1
        const done = num < current
        const active = num === current
        const Icon = step.icon
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done
                    ? "bg-[#4CAF50] text-white"
                    : active
                    ? "bg-[#1565C0] text-white shadow-lg shadow-[#1565C0]/30"
                    : "bg-white/20 text-white/50 border border-white/20"
                }`}
              >
                {done ? <CheckCircle size={18} /> : <Icon size={16} />}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  active ? "text-white" : done ? "text-[#4CAF50]" : "text-white/40"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-1 mb-5 transition-colors ${
                  done ? "bg-[#4CAF50]" : "bg-white/20"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Input component
function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
        {label}
        {required && <span className="text-[#F44336] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[#F44336] text-xs mt-1">{error}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
        hasError ? "border-[#F44336]" : "border-[#E0E0E0]"
      } ${className ?? ""}`}
    />
  )
}

// --- Passo 1: Dados da Empresa ---
interface Step1Data {
  cnpj: string
  companyName: string
  fantasyName: string
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

  async function fetchCNPJ() {
    const digits = data.cnpj.replace(/\D/g, "")
    if (digits.length !== 14) {
      toast.error("CNPJ incompleto")
      return
    }
    setLoadingCNPJ(true)
    try {
      // Mock CNPJ lookup
      await new Promise((r) => setTimeout(r, 800))
      onChange({ companyName: "Construtora Exemplo Ltda" })
      toast.success("Dados do CNPJ preenchidos")
    } catch {
      toast.error("CNPJ não encontrado")
    } finally {
      setLoadingCNPJ(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="CNPJ" required error={errors.cnpj}>
        <div className="flex gap-2">
          <Input
            value={data.cnpj}
            onChange={(e) => onChange({ cnpj: formatCNPJ(e.target.value) })}
            placeholder="00.000.000/0000-00"
            hasError={!!errors.cnpj}
          />
          <button
            type="button"
            onClick={fetchCNPJ}
            disabled={loadingCNPJ}
            className="px-4 py-2.5 rounded-lg bg-[#1565C0] text-white text-sm font-medium hover:bg-[#0D1B3E] transition-all disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5"
          >
            {loadingCNPJ ? <Loader2 size={15} className="animate-spin" /> : null}
            Buscar
          </button>
        </div>
      </FormField>

      <FormField label="Razão Social" error={errors.companyName}>
        <Input
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="Preenchida automaticamente"
          hasError={!!errors.companyName}
        />
      </FormField>

      <FormField label="Nome Fantasia" required error={errors.fantasyName}>
        <Input
          value={data.fantasyName}
          onChange={(e) => onChange({ fantasyName: e.target.value })}
          placeholder="Como a empresa é conhecida"
          hasError={!!errors.fantasyName}
        />
      </FormField>
    </div>
  )
}

// --- Passo 2: Endereço ---
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
    <div className="flex flex-col gap-4">
      <FormField label="CEP" required error={errors.zipcode}>
        <div className="flex gap-2">
          <Input
            value={data.zipcode}
            onChange={(e) => onChange({ zipcode: formatCEP(e.target.value) })}
            placeholder="00000-000"
            hasError={!!errors.zipcode}
          />
          <button
            type="button"
            onClick={fetchCEP}
            disabled={loadingCEP}
            className="px-4 py-2.5 rounded-lg bg-[#1565C0] text-white text-sm font-medium hover:bg-[#0D1B3E] transition-all disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5"
          >
            {loadingCEP ? <Loader2 size={15} className="animate-spin" /> : null}
            Buscar
          </button>
        </div>
      </FormField>

      <FormField label="Logradouro" required error={errors.street}>
        <Input
          value={data.street}
          onChange={(e) => onChange({ street: e.target.value })}
          placeholder="Rua, Avenida, etc."
          hasError={!!errors.street}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Número" required error={errors.number}>
          <Input
            value={data.number}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="000"
            hasError={!!errors.number}
          />
        </FormField>
        <FormField label="Complemento">
          <Input
            value={data.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            placeholder="Sala, Bloco..."
          />
        </FormField>
      </div>

      <FormField label="Bairro" required error={errors.neighbourhood}>
        <Input
          value={data.neighbourhood}
          onChange={(e) => onChange({ neighbourhood: e.target.value })}
          placeholder="Bairro"
          hasError={!!errors.neighbourhood}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormField label="Cidade" required error={errors.city}>
            <Input
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Cidade"
              hasError={!!errors.city}
            />
          </FormField>
        </div>
        <FormField label="UF" required error={errors.state}>
          <select
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
              errors.state ? "border-[#F44336]" : "border-[#E0E0E0]"
            }`}
          >
            <option value="">UF</option>
            {BR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
      </div>
    </div>
  )
}

// --- Passo 3: Contatos ---
interface Step3Data {
  phonePrimary: string
  phoneSecondary: string
  email: string
  website: string
  instagram: string
  whatsapp: string
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
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Telefone principal" required error={errors.phonePrimary}>
          <Input
            value={data.phonePrimary}
            onChange={(e) => onChange({ phonePrimary: formatPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
            hasError={!!errors.phonePrimary}
          />
        </FormField>
        <FormField label="Telefone secundário">
          <Input
            value={data.phoneSecondary}
            onChange={(e) => onChange({ phoneSecondary: formatPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
          />
        </FormField>
      </div>

      <FormField label="E-mail comercial" required error={errors.email}>
        <Input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="contato@empresa.com"
          hasError={!!errors.email}
        />
      </FormField>

      <FormField label="Site">
        <Input
          value={data.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="www.empresa.com.br"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Instagram">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#607D8B] text-sm">@</span>
            <input
              value={data.instagram}
              onChange={(e) => onChange({ instagram: e.target.value })}
              placeholder="empresa"
              className="w-full pl-7 pr-3.5 py-2.5 rounded-lg border border-[#E0E0E0] text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20"
            />
          </div>
        </FormField>
        <FormField label="WhatsApp">
          <Input
            value={data.whatsapp}
            onChange={(e) => onChange({ whatsapp: formatPhone(e.target.value) })}
            placeholder="(00) 00000-0000"
          />
        </FormField>
      </div>
    </div>
  )
}

// --- Main Page ---
export default function OnboardingPage() {
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [step1, setStep1] = useState<Step1Data>({ cnpj: "", companyName: "", fantasyName: "" })
  const [step2, setStep2] = useState<Step2Data>({
    zipcode: "", street: "", number: "", complement: "", neighbourhood: "", city: "", state: "",
  })
  const [step3, setStep3] = useState<Step3Data>({
    phonePrimary: "", phoneSecondary: "", email: "", website: "", instagram: "", whatsapp: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!step3.phonePrimary || step3.phonePrimary.replace(/\D/g, "").length < 10)
      errs.phonePrimary = "Telefone inválido"
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

  const stepTitles = [
    { title: "Dados da empresa", subtitle: "Informe os dados da sua construtora" },
    { title: "Endereço", subtitle: "Onde fica sua empresa?" },
    { title: "Contatos e redes", subtitle: "Como seus clientes podem te contatar?" },
  ]

  return (
    <main className="min-h-screen op-gradient-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <HardHat className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-xl">OBRA PLAY</span>
          </div>
          <p className="text-white/60 text-sm">Vamos configurar sua empresa</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#1A1A2E]">
              {stepTitles[step - 1].title}
            </h2>
            <p className="text-[#607D8B] text-sm mt-0.5">
              {stepTitles[step - 1].subtitle}
            </p>
          </div>

          {step === 1 && (
            <Step1 data={step1} onChange={(d) => setStep1((p) => ({ ...p, ...d }))} errors={errors} />
          )}
          {step === 2 && (
            <Step2 data={step2} onChange={(d) => setStep2((p) => ({ ...p, ...d }))} errors={errors} />
          )}
          {step === 3 && (
            <Step3 data={step3} onChange={(d) => setStep3((p) => ({ ...p, ...d }))} errors={errors} />
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setErrors({}); setStep((s) => s - 1) }}
                className="flex-1 py-2.5 rounded-lg border border-[#E0E0E0] text-[#607D8B] font-semibold text-sm hover:border-[#1565C0] hover:text-[#1565C0] transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm hover:bg-[#0D1B3E] active:scale-[0.98] transition-all"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm hover:bg-[#0D1B3E] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Concluindo...</>
                ) : (
                  <><CheckCircle size={18} /> Concluir</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-white/40 text-xs mt-3">
          Passo {step} de 3 — Este processo não pode ser pulado
        </p>
      </div>
    </main>
  )
}
