"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { toast } from "sonner"

export default function RecuperarSenhaPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError("E-mail obrigatório"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("E-mail inválido"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar e-mail.")
      setSent(true)
      toast.success("Link enviado com sucesso!")
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#F5F5F5] flex flex-col">

      {/* Sub-header branco */}
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
          Recuperar senha
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center px-2 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm" style={{ padding: "24px 16px" }}>
            {!sent ? (
              <>
                <p className="text-[#757575] mb-6" style={{ fontSize: "0.875rem" }}>
                  Informe seu e-mail e enviaremos um link para redefinir sua senha. O link é válido por 24 horas.
                </p>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[#757575] mb-0" style={{ fontSize: "0.75rem" }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError("") }}
                      placeholder="Qual o seu e-mail?"
                      className={`op-input-underline ${error ? "op-input-error" : ""}`}
                    />
                    {error && (
                      <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
                        {error}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="op-btn-primary mt-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "ENVIAR LINK"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-4">
                  <MailCheck className="text-[#4CAF50]" size={32} />
                </div>
                <h2 className="font-bold text-[#212121] mb-2" style={{ fontSize: "1.125rem" }}>
                  E-mail enviado!
                </h2>
                <p className="text-[#757575] mb-6" style={{ fontSize: "0.875rem" }}>
                  Enviamos um link de recuperação para{" "}
                  <strong className="text-[#212121]">{email}</strong>. Verifique sua caixa de entrada e spam.
                </p>
                <Link href="/login" className="op-btn-primary">
                  VOLTAR AO LOGIN
                </Link>
              </div>
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
