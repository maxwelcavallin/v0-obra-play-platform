"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Check, X, Info, ArrowLeft, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

const COUNTRY_CODES = [
  { code: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "+1",  flag: "🇺🇸", name: "EUA / Canadá" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+57", flag: "🇨🇴", name: "Colômbia" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "+598", flag: "🇺🇾", name: "Uruguai" },
  { code: "+595", flag: "🇵🇾", name: "Paraguai" },
  { code: "+591", flag: "🇧🇴", name: "Bolívia" },
  { code: "+593", flag: "🇪🇨", name: "Equador" },
  { code: "+58",  flag: "🇻🇪", name: "Venezuela" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+34",  flag: "🇪🇸", name: "Espanha" },
  { code: "+44",  flag: "🇬🇧", name: "Reino Unido" },
  { code: "+49",  flag: "🇩🇪", name: "Alemanha" },
  { code: "+33",  flag: "🇫🇷", name: "França" },
  { code: "+39",  flag: "🇮🇹", name: "Itália" },
  { code: "+81",  flag: "🇯🇵", name: "Japão" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+91",  flag: "🇮🇳", name: "Índia" },
]

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

interface PasswordRule {
  label: string
  ok: (p: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "Mínimo 8 caracteres", ok: (p) => p.length >= 8 },
  { label: "Letra maiúscula", ok: (p) => /[A-Z]/.test(p) },
  { label: "Número", ok: (p) => /\d/.test(p) },
]

export default function CadastroPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
    terms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordFocus, setPasswordFocus] = useState(false)
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0])
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  function update(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Nome obrigatório"
    if (!form.email) errs.email = "E-mail obrigatório"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "E-mail inválido"
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10)
      errs.phone = "Celular inválido"
    if (!form.cpf || form.cpf.replace(/\D/g, "").length < 11)
      errs.cpf = "CPF inválido"
    if (!form.password) errs.password = "Senha obrigatória"
    else if (form.password.length < 8) errs.password = "Mínimo 8 caracteres"
    if (form.password !== form.confirmPassword) errs.confirmPassword = "As senhas não conferem"
    if (!form.terms) errs.terms = "Aceite os termos para continuar"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      toast.success("Conta criada com sucesso!")
      router.push("/onboarding")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta")
    } finally {
      setLoading(false)
    }
  }

  const showPasswordRules = passwordFocus || form.password.length > 0

  return (
    <main className="op-auth-page">

      {/* Sub-header — height 52px, fundo branco, seta + título centralizado */}
      <header
        className="flex-shrink-0 flex items-center px-4 relative border-b border-[#EEEEEE]"
        style={{ height: 52, backgroundColor: "#fff" }}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span
          className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]"
          style={{ fontSize: "1rem" }}
        >
          Criar conta
        </span>
      </header>

      {/* Formulário — direto no fundo branco, sem card wrapper */}
      {/* padding-bottom 96px para não sobrepor o botão fixo */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 96px" }}>

        <h1
          className="font-bold text-[#212121] mb-1"
          style={{ fontSize: "1.25rem", lineHeight: 1.3 }}
        >
          Crie seu usuário
        </h1>
        <p className="text-[#9E9E9E] mb-6" style={{ fontSize: "0.875rem" }}>
          Confirme seus dados pessoais para criar uma conta no Obra Play.
        </p>

        <form id="cadastro-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Nome completo */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              Nome completo*
            </label>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Qual seu nome completo?"
              className={`op-input-underline ${errors.name ? "op-input-error" : ""}`}
            />
            {errors.name && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Celular com seletor de código de país */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              Celular*
            </label>
            <div
              className={`flex items-center border-b transition-colors ${
                errors.phone
                  ? "border-[#F44336]"
                  : "border-[#E0E0E0] focus-within:border-[#1565C0]"
              }`}
              style={{ paddingTop: 12, paddingBottom: 8 }}
            >
              {/* Seletor de país */}
              <div className="relative flex-shrink-0" ref={countryRef}>
                <button
                  type="button"
                  onClick={() => setCountryOpen((v) => !v)}
                  className="flex items-center gap-1 pr-2 border-r border-[#E0E0E0] mr-2 hover:opacity-70 transition-opacity"
                  aria-label="Selecionar código de país"
                  aria-expanded={countryOpen}
                >
                  <span className="text-base leading-none">{countryCode.flag}</span>
                  <span className="text-[#212121] font-medium" style={{ fontSize: "1rem" }}>
                    {countryCode.code}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-[#9E9E9E] transition-transform"
                    style={{ transform: countryOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>

                {/* Dropdown */}
                {countryOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#EEEEEE] overflow-y-auto z-50"
                    style={{ minWidth: 220, maxHeight: 240 }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code + c.name}
                        type="button"
                        onClick={() => {
                          setCountryCode(c)
                          setCountryOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F5F5] transition-colors ${
                          countryCode.code === c.code && countryCode.name === c.name
                            ? "bg-[#E3F2FD]"
                            : ""
                        }`}
                      >
                        <span className="text-lg leading-none flex-shrink-0">{c.flag}</span>
                        <span className="flex-1 text-[#212121]" style={{ fontSize: "0.875rem" }}>
                          {c.name}
                        </span>
                        <span className="text-[#9E9E9E] font-medium" style={{ fontSize: "0.8125rem" }}>
                          {c.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input do número */}
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="flex-1 bg-transparent border-none outline-none text-[#212121] placeholder:text-[#9E9E9E]"
                style={{ fontSize: "1rem" }}
              />
            </div>
            {errors.phone && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.phone}
              </p>
            )}
          </div>

          {/* CPF */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              CPF*
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => update("cpf", formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              className={`op-input-underline ${errors.cpf ? "op-input-error" : ""}`}
            />
            {errors.cpf && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.cpf}
              </p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              E-mail*
            </label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="Que só você tenha acesso"
              className={`op-input-underline ${errors.email ? "op-input-error" : ""}`}
            />
            {errors.email && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              Senha*
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                placeholder="Defina uma senha de acesso"
                className={`op-input-underline pr-10 ${errors.password ? "op-input-error" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors p-1"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
              Repita a senha*
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Repita a senha"
                className={`op-input-underline pr-10 ${
                  errors.confirmPassword ? "op-input-error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors p-1"
                tabIndex={-1}
                aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Requisitos de senha */}
          {showPasswordRules && (
            <div className="op-info-box">
              <Info size={15} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-2 text-[#757575]" style={{ fontSize: "0.75rem" }}>
                  Utilize letras maiúsculas, letras minúsculas, números, símbolos e no mínimo 8 caracteres.
                </p>
                <div className="flex flex-col gap-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.ok(form.password)
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {ok ? (
                          <Check size={12} className="text-[#4CAF50]" />
                        ) : (
                          <X size={12} className="text-[#BDBDBD]" />
                        )}
                        <span
                          className={ok ? "text-[#4CAF50]" : "text-[#9E9E9E]"}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Por que informar CPF */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-[#1565C0] font-medium text-left"
            style={{ fontSize: "0.8125rem" }}
          >
            <Info size={14} />
            Por que preciso informar o meu CPF?
          </button>

          {/* Termos */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => update("terms", e.target.checked)}
              className="w-4 h-4 mt-0.5 flex-shrink-0 accent-[#1565C0]"
            />
            <span className="text-[#757575]" style={{ fontSize: "0.875rem" }}>
              Li e concordo com os{" "}
              <Link href="/termos" className="text-[#1565C0] hover:underline">
                Termos de uso
              </Link>{" "}
              e{" "}
              <Link href="/privacidade" className="text-[#1565C0] hover:underline">
                Política de Privacidade
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-[#F44336] -mt-2" style={{ fontSize: "0.75rem" }}>
              {errors.terms}
            </p>
          )}

          {/* Link para login */}
          <p className="text-center text-[#757575]" style={{ fontSize: "0.875rem" }}>
            Já tem uma conta?{" "}
            <Link href="/login" className="text-[#1565C0] font-semibold hover:underline">
              Entrar
            </Link>
          </p>

        </form>
      </div>

      {/* Botão CADASTRAR — fixo na base, largura total menos 16px de cada lado */}
      <div
        className="flex-shrink-0 bg-white border-t border-[#EEEEEE]"
        style={{ padding: "16px 16px 20px" }}
      >
        <button
          type="submit"
          form="cadastro-form"
          disabled={loading}
          className="op-btn-primary"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Criando conta...
            </>
          ) : (
            "CADASTRAR"
          )}
        </button>
      </div>
    </main>
  )
}
