"use client"

import { useState } from "react"
import Link from "next/link"
import { HardHat, Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { toast } from "sonner"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError("E-mail obrigatório"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("E-mail inválido"); return }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
    toast.success("Link enviado com sucesso!")
  }

  return (
    <main className="min-h-screen op-gradient-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 border border-white/20">
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">OBRA PLAY</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {!sent ? (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-[#607D8B] text-sm hover:text-[#1565C0] transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Voltar ao login
              </Link>
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">Recuperar senha</h2>
              <p className="text-[#607D8B] text-sm mb-5">
                Informe seu e-mail e enviaremos um link para redefinir sua senha. O link é válido por 24 horas.
              </p>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }}
                    placeholder="seu@email.com"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors bg-white text-[#1A1A2E] placeholder:text-[#B0BEC5] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/20 ${
                      error ? "border-[#F44336]" : "border-[#E0E0E0]"
                    }`}
                  />
                  {error && <p className="text-[#F44336] text-xs mt-1">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm hover:bg-[#0D1B3E] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                  ) : "Enviar link de recuperação"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E8F5E9] mb-4">
                <MailCheck className="w-8 h-8 text-[#4CAF50]" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">E-mail enviado!</h2>
              <p className="text-[#607D8B] text-sm mb-6">
                Enviamos um link de recuperação para{" "}
                <strong className="text-[#1A1A2E]">{email}</strong>. Verifique sua caixa de entrada e spam.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm text-center hover:bg-[#0D1B3E] transition-all"
              >
                Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
