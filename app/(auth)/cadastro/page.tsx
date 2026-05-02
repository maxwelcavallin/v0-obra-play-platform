"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Check, X, Info } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return value
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

  return (
    <main className="op-auth-page">
      {/* AppBar azul com logo */}
      <header className="op-appbar flex items-center justify-center px-4">
        <Image
          src="/logo.svg"
          alt="Obra Play"
          width={150}
          height={24}
          className="h-7 w-auto"
          priority
        />
      </header>

      {/* Conteudo com scroll */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 overflow-y-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-[#212121]">Crie seu usuário</h1>
          <p className="text-sm text-[#757575] mt-1">
            Confirme seus dados pessoais para criar uma conta no Obra Play.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Nome completo */}
          <div>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Qual seu nome completo?*"
              className={`op-input-underline ${errors.name ? "op-input-error" : ""}`}
            />
            {errors.name && <p className="text-[#F44336] text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Celular com bandeira */}
          <div>
            <div className="flex items-center border-b border-[#E0E0E0] focus-within:border-[#1565C0] transition-colors pb-[10px]">
              <span className="text-lg mr-2 flex-shrink-0">🇧🇷</span>
              <span className="text-sm text-[#757575] mr-2">+55</span>
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", formatPhone(e.target.value))}
                placeholder="Qual o número do seu celular?"
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#212121] placeholder:text-[#9E9E9E]"
              />
            </div>
            {errors.phone && <p className="text-[#F44336] text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* CPF */}
          <div>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => update("cpf", e.target.value)}
              placeholder="Qual o seu CPF?*"
              className={`op-input-underline ${errors.cpf ? "op-input-error" : ""}`}
            />
            {errors.cpf && <p className="text-[#F44336] text-xs mt-1">{errors.cpf}</p>}
          </div>

          {/* E-mail */}
          <div>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="Qual o seu e-mail? (Que só você tenha acesso)*"
              className={`op-input-underline ${errors.email ? "op-input-error" : ""}`}
            />
            {errors.email && <p className="text-[#F44336] text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Senha */}
          <div>
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
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-[#F44336] text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirmar senha */}
          <div>
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
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[#F44336] text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Info box de senha */}
          {(passwordFocus || form.password.length > 0) && (
            <div className="op-info-box">
              <Info size={16} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-2">Utilize letras maiúsculas, letras minúsculas, números, símbolos e no mínimo 8 caracteres.</p>
                <div className="flex flex-col gap-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.ok(form.password)
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {ok ? (
                          <Check size={12} className="text-[#4CAF50]" />
                        ) : (
                          <X size={12} className="text-[#9E9E9E]" />
                        )}
                        <span className={`text-xs ${ok ? "text-[#4CAF50]" : "text-[#9E9E9E]"}`}>
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Link CPF */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-[#1565C0] text-sm font-medium text-left"
          >
            <Info size={15} />
            Por que preciso informar o meu CPF?
          </button>

          {/* Termos */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => update("terms", e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-[#E0E0E0] accent-[#1565C0] flex-shrink-0"
            />
            <span className="text-sm text-[#757575]">
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
          {errors.terms && <p className="text-[#F44336] text-xs -mt-3">{errors.terms}</p>}

          {/* Botão */}
          <div className="mt-2">
            <button
              type="submit"
              disabled={loading}
              className="op-btn-primary"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Criando conta...</>
              ) : (
                "CADASTRAR"
              )}
            </button>

            <p className="text-center text-sm text-[#757575] mt-5">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-[#1565C0] font-semibold hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
