"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
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
    <main className="op-auth-page">
      {/* AppBar azul com logo */}
      <header className="op-appbar flex items-center justify-center px-4 relative">
        <Image
          src="/logo.svg"
          alt="Obra Play"
          width={150}
          height={24}
          className="h-7 w-auto"
          priority
        />
      </header>

      {/* Conteudo */}
      <div className="flex-1 flex flex-col px-6 pt-10 pb-6">
        {/* Titulo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#212121]">
            Crie seu usuário
          </h1>
          <p className="text-sm text-[#757575] mt-1">
            Entre com sua conta para continuar no Obra Play.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* E-mail */}
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
              <p className="text-[#F44336] text-xs mt-1">{errors.email}</p>
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
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[#F44336] text-xs mt-1">{errors.password}</p>
            )}
          </div>

          {/* Esqueceu a senha */}
          <div className="flex justify-end -mt-2">
            <Link
              href="/recuperar-senha"
              className="text-sm text-[#1565C0] font-medium hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>

          {/* Botão */}
          <div className="mt-auto pt-4">
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

            <p className="text-center text-sm text-[#757575] mt-6">
              Não tem uma conta?{" "}
              <Link
                href="/cadastro"
                className="text-[#1565C0] font-semibold hover:underline"
              >
                Criar conta
              </Link>
            </p>

            <p className="text-center text-xs text-[#9E9E9E] mt-4">
              Demo: carlos@construtora.com / senha123
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
