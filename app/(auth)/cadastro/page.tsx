"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Check, X, Info, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

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
    <main className="min-h-dvh bg-[#F5F5F5] flex flex-col">

      {/* Sub-header branco — height 52px com seta + título centralizado */}
      <header
        className="flex-shrink-0 bg-white flex items-center px-4 relative border-b border-[#EEEEEE]"
        style={{ height: 52 }}
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

      {/* Conteúdo scrollável */}
      <div className="flex-1 flex flex-col items-center px-2 py-4 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Card principal */}
          <div className="bg-white rounded-lg shadow-sm" style={{ padding: "20px 16px" }}>
            <h1
              className="font-bold text-[#212121] mb-1"
              style={{ fontSize: "1.25rem", lineHeight: 1.3 }}
            >
              Crie seu usuário
            </h1>
            <p className="text-[#757575] mb-6" style={{ fontSize: "0.875rem" }}>
              Confirme seus dados pessoais para criar uma conta no Obra Play.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

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

              {/* Celular com bandeira */}
              <div>
                <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
                  Celular*
                </label>
                <div
                  className={`flex items-center border-b transition-colors ${
                    errors.phone ? "border-[#F44336]" : "border-[#E0E0E0] focus-within:border-[#1565C0]"
                  }`}
                  style={{ paddingTop: 12, paddingBottom: 8 }}
                >
                  <span className="text-base mr-1.5 flex-shrink-0 leading-none">🇧🇷</span>
                  <span
                    className="text-[#9E9E9E] mr-2 flex-shrink-0"
                    style={{ fontSize: "0.9375rem" }}
                  >
                    +55
                  </span>
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
                    className={`op-input-underline pr-10 ${errors.confirmPassword ? "op-input-error" : ""}`}
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

              {/* Botão CADASTRAR — height 56px */}
              <button
                type="submit"
                disabled={loading}
                className="op-btn-primary mt-2"
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
            </form>
          </div>

          {/* Link para login */}
          <p className="text-center text-[#757575] mt-5 mb-6" style={{ fontSize: "0.875rem" }}>
            Já tem uma conta?{" "}
            <Link href="/login" className="text-[#1565C0] font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
