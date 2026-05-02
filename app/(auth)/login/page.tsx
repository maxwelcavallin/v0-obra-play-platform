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
    <main className="op-auth-page">

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "56px 24px 0" }}>

        {/* Logo centralizada */}
        <div className="flex justify-center" style={{ marginBottom: 40 }}>
          <Image
            src="/logo.svg"
            alt="Obra Play"
            width={200}
            height={52}
            priority
            style={{ width: 200, height: "auto" }}
          />
        </div>

        <h1
          className="font-bold text-[#212121] mb-1"
          style={{ fontSize: "1.375rem", lineHeight: 1.3 }}
        >
          Entrar
        </h1>
        <p className="text-[#9E9E9E] mb-6" style={{ fontSize: "0.875rem" }}>
          Entre com sua conta para continuar no Obra Play.
        </p>

        <form id="login-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-1 pb-6">

          {/* E-mail */}
          <div className="mb-2">
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
              <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Senha */}
          <div className="mb-1">
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
                placeholder="Sua senha de acesso"
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

          {/* Esqueci a senha */}
          <div className="flex justify-end mb-4">
            <Link
              href="/recuperar-senha"
              className="text-[#1565C0] font-medium hover:underline"
              style={{ fontSize: "0.875rem" }}
            >
              Esqueci minha senha
            </Link>
          </div>

          {/* Criar conta */}
          <p className="text-center text-[#757575]" style={{ fontSize: "0.875rem" }}>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-[#1565C0] font-semibold hover:underline">
              Criar conta
            </Link>
          </p>

          <p className="text-center text-[#BDBDBD] mt-2" style={{ fontSize: "0.75rem" }}>
            Demo: carlos@construtora.com / senha123
          </p>
        </form>
      </div>

      {/* Botão ENTRAR — rodapé fixo, fora do scroll, mesmo padrão do Cadastro */}
      <div
        className="flex-shrink-0 bg-white border-t border-[#EEEEEE]"
        style={{ padding: "12px 16px 24px" }}
      >
        <button
          type="submit"
          form="login-form"
          disabled={loading}
          className="op-btn-primary"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Entrando...
            </>
          ) : (
            "ENTRAR"
          )}
        </button>
      </div>
    </main>
  )
}
