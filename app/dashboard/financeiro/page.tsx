"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, TrendingUp, TrendingDown, Loader2,
  Search, ChevronLeft, ChevronRight, Tag, ChevronRight as GoIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { fmtBRL } from "@/lib/money"

interface Transacao {
  id: string
  description: string
  amount: number
  type: "receita" | "despesa"
  status: "pendente" | "pago" | "cancelado"
  due_date: string | null
  paid_at: string | null
  recurrence: string | null
  category_name: string | null
  category_color: string | null
  client_name: string | null
  client_fantasy: string | null
}

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
]

function fmtData(d: string | null) {
  if (!d) return "—"
  const [y, m, day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}
function currentYYYYMM() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
}

export default function FinanceiroPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<"todas" | "receita" | "despesa">("todas")
  const [statusFilter, setStatusFilter] = useState<"" | "pendente" | "pago" | "cancelado">("")
  const [search, setSearch]         = useState("")
  const [month, setMonth]           = useState(currentYYYYMM())

  const fetchTransacoes = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ company_id: activeCompany.id, month })
      if (tab !== "todas")    qs.set("type", tab)
      if (statusFilter)       qs.set("status", statusFilter)
      if (search.trim())      qs.set("search", search.trim())

      const res = await authFetch(`/api/financeiro/transacoes?${qs}`)
      const data = await res.json()
      console.log("[financeiro] transacoes recebidas:", Array.isArray(data) ? data.length : data)
      setTransacoes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[financeiro] erro ao buscar transacoes:", err)
      setTransacoes([])
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id, month, tab, statusFilter, search])

  useEffect(() => { fetchTransacoes() }, [fetchTransacoes])

  // Navega mês
  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const receitas  = transacoes.filter(t => t.type === "receita" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)
  const despesas  = transacoes.filter(t => t.type === "despesa" && t.status === "pago").reduce((s, t) => s + Number(t.amount), 0)
  const pendentes = transacoes.filter(t => t.status === "pendente").reduce((s, t) => s + Number(t.amount), 0)
  const saldo     = receitas - despesas

  const [y, m] = month.split("-").map(Number)
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">

      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-16">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-semibold text-lg flex-1">Financeiro</h1>
          <button
            onClick={() => router.push("/dashboard/financeiro/categorias")}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            aria-label="Categorias"
          >
            <Tag size={18} className="text-white" />
          </button>
          <button
            onClick={() => router.push("/dashboard/financeiro/nova")}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            aria-label="Nova transação"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => changeMonth(-1)} className="text-white/70 hover:text-white p-1">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-semibold text-base w-44 text-center">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="text-white/70 hover:text-white p-1">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Cards de resumo sobrepostos */}
      <div className="px-4 -mt-12 grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm col-span-2 flex gap-4">
          <div className="flex-1">
            <p className="text-[#9E9E9E] text-xs mb-1">Receitas pagas</p>
            <p className="font-bold text-[#4CAF50] text-base">{fmtBRL(receitas)}</p>
          </div>
          <div className="w-px bg-[#F5F5F5]" />
          <div className="flex-1">
            <p className="text-[#9E9E9E] text-xs mb-1">Despesas pagas</p>
            <p className="font-bold text-[#F44336] text-base">{fmtBRL(despesas)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-[#9E9E9E] text-xs mb-1">Saldo</p>
          <p className="font-bold text-base" style={{ color: saldo >= 0 ? "#1565C0" : "#F44336" }}>{fmtBRL(saldo)}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-[#9E9E9E] text-xs mb-1">A receber/pagar</p>
          <p className="font-bold text-[#FF9800] text-base">{fmtBRL(pendentes)}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="px-4 mb-3">
        <div className="bg-white rounded-xl flex items-center gap-2 px-3 shadow-sm">
          <Search size={16} className="text-[#9E9E9E] flex-shrink-0" />
          <input
            className="flex-1 py-2.5 text-sm outline-none bg-transparent text-[#212121] placeholder:text-[#BDBDBD]"
            placeholder="Buscar transação ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs tipo */}
      <div className="flex gap-1.5 px-4 mb-2">
        {(["todas", "receita", "despesa"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === t ? "bg-[#1565C0] text-white" : "bg-white text-[#757575] shadow-sm"
            }`}>
            {t === "todas" ? "Todas" : t === "receita" ? "Receitas" : "Despesas"}
          </button>
        ))}
        <div className="flex-1" />
        {/* Filter status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="text-xs text-[#757575] bg-white rounded-full px-2 py-1.5 shadow-sm border-none outline-none"
        >
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 flex flex-col gap-2 pb-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loading && transacoes.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <TrendingUp size={40} className="text-[#E0E0E0]" />
            <p className="text-[#9E9E9E] text-sm">Nenhuma transação em {monthLabel}</p>
            <button onClick={() => router.push("/dashboard/financeiro/nova")}
              className="mt-1 px-5 py-2.5 bg-[#1565C0] text-white text-sm font-semibold rounded-full">
              Nova transação
            </button>
          </div>
        )}
        {!loading && transacoes.map(t => {
          const isVencida = t.status === "pendente" && t.due_date && new Date(t.due_date) < new Date()
          return (
            <button key={t.id}
              onClick={() => router.push(`/dashboard/financeiro/${t.id}`)}
              className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 text-left w-full hover:shadow-md transition-shadow">
              {/* Ícone colorido pela cor da categoria ou tipo */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: t.type === "receita" ? "#E8F5E9" : "#FFEBEE" }}>
                {t.type === "receita"
                  ? <TrendingUp size={16} className="text-[#4CAF50]" />
                  : <TrendingDown size={16} className="text-[#F44336]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#212121] truncate">{t.description}</p>
                <p className="text-xs text-[#9E9E9E] truncate">
                  {t.category_name ?? "Sem categoria"}
                  {(t.client_name || t.client_fantasy) ? ` · ${t.client_fantasy ?? t.client_name}` : ""}
                </p>
                <p className={`text-xs ${isVencida ? "text-[#F44336] font-medium" : "text-[#BDBDBD]"}`}>
                  {t.status === "pago" && t.paid_at ? `Pago em ${fmtData(t.paid_at)}` : `Vence ${fmtData(t.due_date)}`}
                  {isVencida ? " · Vencida" : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className="font-bold text-sm" style={{ color: t.type === "receita" ? "#4CAF50" : "#F44336" }}>
                  {t.type === "receita" ? "+" : "-"}{fmtBRL(Number(t.amount))}
                </p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: t.status === "pago" ? "#E8F5E9" : t.status === "cancelado" ? "#FFEBEE" : isVencida ? "#FFF3E0" : "#FFF8E1",
                    color: t.status === "pago" ? "#388E3C" : t.status === "cancelado" ? "#D32F2F" : isVencida ? "#E65100" : "#F57F17",
                  }}>
                  {t.status === "pago" ? "Pago" : t.status === "cancelado" ? "Cancelado" : isVencida ? "Vencida" : "Pendente"}
                </span>
              </div>
              <GoIcon size={14} className="text-[#BDBDBD] flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
