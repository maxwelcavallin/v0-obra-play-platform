"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, HardHat, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function validate() {
    const errs: typeof errors = {}
    if (!email) errs.email = "E-mail obrigatório"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail inválido"
    if (!password) errs.password = "Senha obrigatória"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      toast.success("Login realizado com sucesso!")
      router.push("/dashboard")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen op-gradient-bg flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-10 w-40 h-40 rounded-full bg-[#1565C0]/30" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            OBRA PLAY
          </h1>
          <p className="text-white/60 mt-1 text-sm">Gestão de obras e compras</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">Bem-vindo de volta</h2>
          <p className="text-[#607D8B] text-sm mb-6">Entre com sua conta para continuar</p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                placeholder="seu@email.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                  errors.email ? "border-[#F44336]" : "border-[#E0E0E0]"
                }`}
              />
              {errors.email && (
                <p className="text-[#F44336] text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                  }}
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
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E0E0E0] accent-[#1565C0]"
                />
                <span className="text-sm text-[#607D8B]">Lembrar-me</span>
              </label>
              <Link
                href="/recuperar-senha"
                className="text-sm text-[#1565C0] hover:text-[#0D1B3E] font-medium transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm hover:bg-[#0D1B3E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-[#607D8B] mt-5">
            Não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="text-[#1565C0] font-semibold hover:text-[#0D1B3E] transition-colors"
            >
              Criar conta
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 text-center">
          <p className="text-white/40 text-xs">
            Demo: carlos@construtora.com / senha123
          </p>
        </div>
      </div>
    </main>
  )
}
