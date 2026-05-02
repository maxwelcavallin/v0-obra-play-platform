"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, HardHat, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

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
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordFocus, setPasswordFocus] = useState(false)

  function update(field: string, value: string) {
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
    if (!form.confirmPassword) errs.confirmPassword = "Confirme a senha"
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "As senhas não conferem"
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
    <main className="min-h-screen op-gradient-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-10 w-40 h-40 rounded-full bg-[#1565C0]/30" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/20">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">OBRA PLAY</h1>
          <p className="text-white/60 text-sm">Gestão de obras e compras</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">Criar conta</h2>
          <p className="text-[#607D8B] text-sm mb-5">Preencha os dados para se cadastrar</p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Seu nome completo"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                  errors.name ? "border-[#F44336]" : "border-[#E0E0E0]"
                }`}
              />
              {errors.name && <p className="text-[#F44336] text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="seu@email.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                  errors.email ? "border-[#F44336]" : "border-[#E0E0E0]"
                }`}
              />
              {errors.email && <p className="text-[#F44336] text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Celular */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Celular
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                  errors.phone ? "border-[#F44336]" : "border-[#E0E0E0]"
                }`}
              />
              {errors.phone && <p className="text-[#F44336] text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  onFocus={() => setPasswordFocus(true)}
                  onBlur={() => setPasswordFocus(false)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                    errors.password ? "border-[#F44336]" : "border-[#E0E0E0]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607D8B] hover:text-[#1565C0] transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[#F44336] text-xs mt-1">{errors.password}</p>
              )}
              {/* Password rules */}
              {(passwordFocus || form.password.length > 0) && (
                <div className="mt-2 flex flex-col gap-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.ok(form.password)
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {ok ? (
                          <Check size={12} className="text-[#4CAF50]" />
                        ) : (
                          <X size={12} className="text-[#B0BEC5]" />
                        )}
                        <span
                          className={`text-xs ${ok ? "text-[#4CAF50]" : "text-[#B0BEC5]"}`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Repita a senha"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                    errors.confirmPassword ? "border-[#F44336]" : "border-[#E0E0E0]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607D8B] hover:text-[#1565C0] transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[#F44336] text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm hover:bg-[#0D1B3E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#607D8B] mt-5">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-[#1565C0] font-semibold hover:text-[#0D1B3E] transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
