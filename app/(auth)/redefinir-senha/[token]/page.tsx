"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function RedefinirSenhaPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao redefinir senha.")
      setDone(true)
      toast.success("Senha alterada com sucesso!")
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#F5F5F5] flex flex-col">
      <header
        className="flex-shrink-0 bg-white flex items-center px-4 relative border-b border-[#EEEEEE]"
        style={{ height: 52 }}
      >
        <button
          onClick={() => router.push("/login")}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span
          className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]"
          style={{ fontSize: "1rem" }}
        >
          Nova senha
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center px-2 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm" style={{ padding: "24px 16px" }}>
            {done ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-[#4CAF50]" size={32} />
                </div>
                <h2 className="font-bold text-[#212121] mb-2" style={{ fontSize: "1.125rem" }}>
                  Senha alterada!
                </h2>
                <p className="text-[#757575] mb-6" style={{ fontSize: "0.875rem" }}>
                  Sua senha foi atualizada com sucesso. Faça login com a nova senha.
                </p>
                <Link href="/login" className="op-btn-primary">
                  IR PARA O LOGIN
                </Link>
              </div>
            ) : (
              <>
                <p className="text-[#757575] mb-6" style={{ fontSize: "0.875rem" }}>
                  Escolha uma nova senha com ao menos 6 caracteres.
                </p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  {/* Nova senha */}
                  <div>
                    <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError("") }}
                        placeholder="Nova senha"
                        className="op-input-underline pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-0 bottom-2 text-[#9E9E9E] hover:text-[#212121] transition-colors"
                        aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar senha */}
                  <div>
                    <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
                      Confirmar senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setError("") }}
                        placeholder="Repita a nova senha"
                        className={`op-input-underline pr-10 ${error ? "op-input-error" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-0 bottom-2 text-[#9E9E9E] hover:text-[#212121] transition-colors"
                        aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {error && (
                      <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                        {error}
                      </p>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="op-btn-primary mt-1">
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                    ) : (
                      "SALVAR NOVA SENHA"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-[#757575] mt-5" style={{ fontSize: "0.875rem" }}>
            Lembrou a senha?{" "}
            <Link href="/login" className="text-[#1565C0] font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
