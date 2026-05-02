"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="min-h-dvh bg-white flex flex-col">
      {/* AppBar azul com logo — medidas exatas do HTML: height 56px, logo 200x26 */}
      <header
        className="flex-shrink-0 bg-[#1565C0] flex items-center justify-center"
        style={{ height: 56 }}
      >
        <Image
          src="/logo.svg"
          alt="Obra Play"
          width={200}
          height={26}
          style={{ height: 26, width: "auto" }}
          priority
        />
      </header>

      {/* Conteúdo centralizado — max-width 444px igual ao HTML original */}
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full" style={{ maxWidth: 444 }}>
          {/* Título */}
          <div className="mb-8">
            <h1
              className="font-bold text-[#212121]"
              style={{ fontSize: "1.5rem", lineHeight: 1.3 }}
            >
              Crie seu usuário
            </h1>
            <p className="text-[#757575] mt-1" style={{ fontSize: "0.875rem" }}>
              Entre com sua conta para continuar no Obra Play.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
            {/* E-mail — input sublinhado, padding 16px 0 8px, font-size 1rem */}
            <div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                placeholder="Qual o seu e-mail?"
                className={`op-input-underline ${errors.email ? "op-input-error" : ""}`}
              />
              {errors.email && (
                <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div>
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
                  placeholder="Defina uma senha de acesso"
                  className={`op-input-underline pr-10 ${errors.password ? "op-input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>{errors.password}</p>
              )}
            </div>

            {/* Esqueceu a senha */}
            <div className="flex justify-end pt-1">
              <Link
                href="/recuperar-senha"
                className="text-[#1565C0] font-medium hover:underline"
                style={{ fontSize: "0.875rem" }}
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Botão ENTRAR — height 56px, border-radius 4px, font-size 0.9375rem */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="op-btn-primary"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Entrando...</>
                ) : (
                  "ENTRAR"
                )}
              </button>
            </div>

            <p className="text-center text-[#757575] mt-6" style={{ fontSize: "0.875rem" }}>
              Não tem uma conta?{" "}
              <Link
                href="/cadastro"
                className="text-[#1565C0] font-semibold hover:underline"
              >
                Criar conta
              </Link>
            </p>

            <p className="text-center text-[#9E9E9E] mt-2" style={{ fontSize: "0.75rem" }}>
              Demo: carlos@construtora.com / senha123
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
