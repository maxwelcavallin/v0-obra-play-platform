"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp, TrendingDown, ArrowLeft, Settings, Clock,
  ChevronRight, Loader2, BarChart3, Wallet, Plus, ArrowRightLeft
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { fmtBRL } from "@/lib/money"

interface DashboardData {
  summary: {
    receitas_pagas:  number
    despesas_pagas:  number
    a_receber:       number
    a_pagar:         number
    resultado_mes:   number
  }
  chart: Array<{ month: string; receitas: number; despesas: number }>
  vencimentos: Array<{
    id: string; description: string; amount: number; type: string
    due_date: string; category_name: string | null; category_color: string | null
  }>
}

const MONTH_SHORT: Record<string, string> = {
  "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez",
}

function fmtDue(d: string | null) {
  if (!d) return "—"
  const [, m, day] = d.split("T")[0].split("-")
  return `${day}/${m}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const [year, mon] = (label ?? "").split("-")
  const lbl = `${MONTH_SHORT[mon] ?? mon}/${year}`
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-[#212121] mb-1">{lbl}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmtBRL(p.value)}</p>
      ))}
    </div>
  )
}

export default function FinanceiroDashboard() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [data, setData]   = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)

  const fetchDashboard = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/financeiro/relatorios?company_id=${activeCompany.id}&tipo=dashboard`)
      if (!res.ok) throw new Error("Erro ao carregar dashboard")
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("[financeiro-dashboard] erro:", err)
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const s = data?.summary
  const saldo = (Number(s?.receitas_pagas ?? 0)) - (Number(s?.despesas_pagas ?? 0))
  const chartData = (data?.chart ?? []).map(c => ({
    ...c,
    receitas: Number(c.receitas),
    despesas: Number(c.despesas),
    label: `${MONTH_SHORT[c.month.split("-")[1]] ?? ""}`,
  }))

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">

      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-20">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-xl flex-1">Financeiro</h1>
          <button onClick={() => router.push("/dashboard/financeiro/configuracoes")}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <Settings size={18} className="text-white" />
          </button>
        </div>
        <p className="text-white/70 text-sm ml-9">Visão geral da sua empresa</p>
      </div>

      {/* Cards sobrepostos */}
      <div className="px-4 -mt-14 mb-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#1565C0]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Saldo total — largo */}
            <div className="col-span-2 bg-[#1A237E] rounded-2xl p-4 shadow-md flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs mb-0.5">Saldo do mês</p>
                <p className={`text-2xl font-bold ${saldo >= 0 ? "text-white" : "text-[#FF6B6B]"}`}>
                  {fmtBRL(saldo)}
                </p>
              </div>
              <Wallet size={32} className="text-white/30" />
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-[#4CAF50]" />
                <p className="text-[#9E9E9E] text-[11px]">Receitas pagas</p>
              </div>
              <p className="font-bold text-[#4CAF50] text-sm">{fmtBRL(Number(s?.receitas_pagas ?? 0))}</p>
              {Number(s?.a_receber ?? 0) > 0 && (
                <p className="text-[10px] text-[#9E9E9E] mt-0.5">+{fmtBRL(Number(s?.a_receber ?? 0))} a receber</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={13} className="text-[#F44336]" />
                <p className="text-[#9E9E9E] text-[11px]">Despesas pagas</p>
              </div>
              <p className="font-bold text-[#F44336] text-sm">{fmtBRL(Number(s?.despesas_pagas ?? 0))}</p>
              {Number(s?.a_pagar ?? 0) > 0 && (
                <p className="text-[10px] text-[#9E9E9E] mt-0.5">+{fmtBRL(Number(s?.a_pagar ?? 0))} a pagar</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico barras 6 meses */}
      <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-[#1565C0]" />
          <p className="font-semibold text-[#212121] text-sm">Entradas vs Saídas — 6 meses</p>
        </div>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#BDBDBD]" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-[#BDBDBD]">
            Sem dados para exibir
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F5F5F5" }} />
              <Legend
                iconType="circle" iconSize={7}
                formatter={(v) => <span style={{ fontSize: 10, color: "#616161" }}>{v}</span>}
              />
              <Bar dataKey="receitas" name="Receitas" fill="#4CAF50" radius={[4,4,0,0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#F44336" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Próximos vencimentos */}
      <div className="mx-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[#FF9800]" />
            <p className="font-semibold text-[#212121] text-sm">Próximos vencimentos</p>
          </div>
          <button onClick={() => router.push("/dashboard/financeiro/lancamentos?status=pendente")}
            className="text-xs text-[#1565C0] font-medium">Ver todos</button>
        </div>
        {loading ? (
          <div className="p-4 flex justify-center"><Loader2 size={18} className="animate-spin text-[#BDBDBD]" /></div>
        ) : (data?.vencimentos ?? []).length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[#9E9E9E]">Nenhum vencimento nos próximos dias</div>
        ) : (
          <ul>
            {(data?.vencimentos ?? []).map((v, i) => {
              const isVencida = v.due_date && new Date(v.due_date) < new Date()
              return (
                <li key={v.id}>
                  <button onClick={() => router.push(`/dashboard/financeiro/lancamentos/${v.id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors ${i > 0 ? "border-t border-[#F5F5F5]" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isVencida ? "bg-[#FFEBEE]" : "bg-[#FFF8E1]"}`}>
                      {v.type === "receita"
                        ? <TrendingUp size={13} className={isVencida ? "text-[#D32F2F]" : "text-[#F57F17]"} />
                        : <TrendingDown size={13} className={isVencida ? "text-[#D32F2F]" : "text-[#F57F17]"} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#212121] font-medium truncate">{v.description}</p>
                      {v.category_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: v.category_color ? `${v.category_color}20` : "#F5F5F5", color: v.category_color ?? "#9E9E9E" }}>
                          {v.category_name}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${isVencida ? "text-[#F44336]" : v.type === "receita" ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                        {fmtBRL(Number(v.amount))}
                      </p>
                      <p className={`text-[10px] ${isVencida ? "text-[#F44336] font-semibold" : "text-[#9E9E9E]"}`}>{fmtDue(v.due_date)}</p>
                    </div>
                    <ChevronRight size={13} className="text-[#BDBDBD] flex-shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Atalhos */}
      <div className="mx-4 mb-32 grid grid-cols-2 gap-2">
        <button onClick={() => router.push("/dashboard/financeiro/lancamentos")}
          className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow text-left">
          <BarChart3 size={20} className="text-[#1565C0]" />
          <p className="font-semibold text-[#212121] text-sm">Lançamentos</p>
          <p className="text-[11px] text-[#9E9E9E]">Extrato completo</p>
        </button>
        <button onClick={() => router.push("/dashboard/financeiro/relatorios")}
          className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow text-left">
          <TrendingUp size={20} className="text-[#4CAF50]" />
          <p className="font-semibold text-[#212121] text-sm">Relatórios</p>
          <p className="text-[11px] text-[#9E9E9E]">Fluxo e extrato</p>
        </button>
      </div>

      {/* FAB expandido — novo lançamento */}
      {fabOpen && <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150">
              <span className="bg-[#212121] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">Transferência</span>
              <button onClick={() => { setFabOpen(false); router.push("/dashboard/financeiro/lancamentos/nova?type=transferencia") }}
                className="w-11 h-11 rounded-full bg-[#1565C0] shadow-lg flex items-center justify-center hover:bg-[#0D47A1] transition-colors">
                <ArrowRightLeft size={18} className="text-white" />
              </button>
            </div>
            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 delay-75">
              <span className="bg-[#212121] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">Despesa</span>
              <button onClick={() => { setFabOpen(false); router.push("/dashboard/financeiro/lancamentos/nova?type=despesa") }}
                className="w-11 h-11 rounded-full bg-[#F44336] shadow-lg flex items-center justify-center hover:bg-[#D32F2F] transition-colors">
                <TrendingDown size={18} className="text-white" />
              </button>
            </div>
            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 delay-150">
              <span className="bg-[#212121] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">Receita</span>
              <button onClick={() => { setFabOpen(false); router.push("/dashboard/financeiro/lancamentos/nova?type=receita") }}
                className="w-11 h-11 rounded-full bg-[#4CAF50] shadow-lg flex items-center justify-center hover:bg-[#388E3C] transition-colors">
                <TrendingUp size={18} className="text-white" />
              </button>
            </div>
          </>
        )}
        <button onClick={() => setFabOpen(v => !v)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${fabOpen ? "bg-[#616161] rotate-45" : "bg-[#1565C0]"}`}>
          <Plus size={24} className="text-white" />
        </button>
      </div>

    </div>
  )
}
