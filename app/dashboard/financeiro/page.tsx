"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface Transacao {
  id: string
  description: string
  amount: number
  type: "receita" | "despesa"
  status: "pendente" | "pago" | "cancelado"
  due_date: string | null
  paid_at: string | null
  category_name: string | null
  category_color: string | null
  client_name: string | null
  client_fantasy: string | null
}

export default function FinanceiroPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"todas" | "receita" | "despesa">("todas")

  useEffect(() => {
    if (!activeCompany?.id) return
    setLoading(true)
    authFetch(`/api/financeiro/transacoes?company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((data) => setTransacoes(Array.isArray(data) ? data : []))
      .catch(() => setTransacoes([]))
      .finally(() => setLoading(false))
  }, [activeCompany?.id])

  const filtradas = transacoes.filter((t) => tab === "todas" || t.type === tab)
  const totalReceitas = transacoes.filter((t) => t.type === "receita" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)
  const totalDespesas = transacoes.filter((t) => t.type === "despesa" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)
  const saldo = totalReceitas - totalDespesas

  function fmtMoeda(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  function fmtData(d: string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("pt-BR")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1">Financeiro</h1>
        <button
          onClick={() => router.push("/dashboard/financeiro/nova")}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label="Nova transação"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="px-4 -mt-1 grid grid-cols-3 gap-2 pb-3">
        {[
          { label: "Receitas", value: totalReceitas, color: "#4CAF50", icon: TrendingUp },
          { label: "Despesas", value: totalDespesas, color: "#F44336", icon: TrendingDown },
          { label: "Saldo", value: saldo, color: saldo >= 0 ? "#1565C0" : "#F44336", icon: saldo >= 0 ? TrendingUp : TrendingDown },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-[#9E9E9E] text-xs mb-1">{c.label}</p>
            <p className="font-bold text-sm" style={{ color: c.color }}>{fmtMoeda(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3">
        {(["todas", "receita", "despesa"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === t ? "bg-[#1565C0] text-white" : "bg-white text-[#757575]"
            }`}
          >
            {t === "todas" ? "Todas" : t === "receita" ? "Receitas" : "Despesas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 flex flex-col gap-2">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loading && filtradas.length === 0 && (
          <div className="text-center py-16 text-[#9E9E9E] text-sm">
            Nenhuma transação encontrada
          </div>
        )}
        {!loading && filtradas.map((t) => (
          <div key={t.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: t.type === "receita" ? "#E8F5E9" : "#FFEBEE" }}
            >
              {t.type === "receita"
                ? <TrendingUp size={16} className="text-[#4CAF50]" />
                : <TrendingDown size={16} className="text-[#F44336]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#212121] truncate">{t.description}</p>
              <p className="text-xs text-[#9E9E9E] truncate">
                {t.category_name ?? "Sem categoria"}
                {t.client_name || t.client_fantasy
                  ? ` · ${t.client_fantasy ?? t.client_name}`
                  : ""}
              </p>
              <p className="text-xs text-[#BDBDBD]">
                {t.status === "pago" && t.paid_at
                  ? `Pago em ${fmtData(t.paid_at)}`
                  : `Vence ${fmtData(t.due_date)}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm" style={{ color: t.type === "receita" ? "#4CAF50" : "#F44336" }}>
                {t.type === "receita" ? "+" : "-"}{fmtMoeda(Number(t.amount))}
              </p>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: t.status === "pago" ? "#E8F5E9" : t.status === "cancelado" ? "#FFEBEE" : "#FFF8E1",
                  color: t.status === "pago" ? "#388E3C" : t.status === "cancelado" ? "#D32F2F" : "#F57F17",
                }}
              >
                {t.status === "pago" ? "Pago" : t.status === "cancelado" ? "Cancelado" : "Pendente"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="h-6" />
    </div>
  )
}
