"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, TrendingUp, TrendingDown, Loader2, Building2, ChevronRight, BarChart3, FileDown,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { fmtBRL } from "@/lib/money"
import { exportFluxoPDF, exportContasPagarPDF, exportExtratoPDF } from "@/lib/pdf-export"

interface FluxoRow {
  month: string; receitas: number; despesas: number
  a_receber: number; a_pagar: number
  saldo: number  // saldo acumulado incluindo initial_balance das contas
}
interface ContasPagar {
  id: string; description: string; amount: number; type: string
  due_date: string | null; client_name: string | null; client_fantasy: string | null
  category_name: string | null; account_name: string | null
}
interface Obra { id: string; name: string }

const MONTH_SHORT: Record<string, string> = {
  "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez",
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  const [y,m,day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

type Tab = "fluxo" | "contas_pagar" | "extrato_obra"

export default function RelatoriosPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [tab, setTab] = useState<Tab>("fluxo")

  // Fluxo de caixa
  const [fluxo, setFluxo]         = useState<FluxoRow[]>([])
  const [loadingFluxo, setLoadingFluxo] = useState(true)
  const [fluxoMonths, setFluxoMonths]   = useState(6)

  // Contas a pagar
  const [contasPagar, setContasPagar]     = useState<ContasPagar[]>([])
  const [loadingCP, setLoadingCP]         = useState(false)

  // Extrato por obra
  const [obras, setObras]           = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState("")
  const [extratoObra, setExtratoObra]   = useState<{ rows: any[]; totals: any } | null>(null)
  const [loadingEO, setLoadingEO]       = useState(false)

  // Exportação
  const [exporting, setExporting] = useState(false)

  const fetchFluxo = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoadingFluxo(true)
    try {
      const res = await authFetch(`/api/financeiro/relatorios?company_id=${activeCompany.id}&tipo=fluxo&months=${fluxoMonths}`)
      const data = await res.json()
      // API retorna { rows: FluxoRow[], saldo_base: number }
      setFluxo(Array.isArray(data) ? data : (data?.rows ?? []))
    } catch (err) { console.error("[relatorios] fluxo:", err) }
    finally { setLoadingFluxo(false) }
  }, [activeCompany?.id, fluxoMonths])

  const fetchCP = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoadingCP(true)
    try {
      const res = await authFetch(`/api/financeiro/relatorios?company_id=${activeCompany.id}&tipo=contas_pagar`)
      const data = await res.json()
      setContasPagar(Array.isArray(data) ? data : [])
    } catch (err) { console.error("[relatorios] cp:", err) }
    finally { setLoadingCP(false) }
  }, [activeCompany?.id])

  useEffect(() => { fetchFluxo() }, [fetchFluxo])
  useEffect(() => { if (tab === "contas_pagar") fetchCP() }, [tab, fetchCP])
  useEffect(() => {
    if (!activeCompany?.id) return
    authFetch(`/api/obras?company_id=${activeCompany.id}`).then(r => r.json()).then(d => setObras(Array.isArray(d) ? d : d?.obras ?? []))
  }, [activeCompany?.id])

  async function fetchExtratoObra(obraId: string) {
    if (!obraId || !activeCompany?.id) return
    setLoadingEO(true)
    try {
      const res = await authFetch(`/api/financeiro/relatorios?company_id=${activeCompany.id}&tipo=extrato_obra&obra_id=${obraId}`)
      const data = await res.json()
      setExtratoObra(data)
    } catch (err) { console.error("[relatorios] eo:", err) }
    finally { setLoadingEO(false) }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const companyName = (activeCompany as any)?.fantasy_name ?? (activeCompany as any)?.company_name ?? activeCompany?.fantasyName ?? activeCompany?.companyName ?? "Empresa"
      if (tab === "fluxo") {
        exportFluxoPDF(fluxo, companyName)
      } else if (tab === "contas_pagar") {
        exportContasPagarPDF(contasPagar, companyName)
      } else if (tab === "extrato_obra") {
        const obraName = obras.find(o => o.id === selectedObra)?.name ?? "Obra"
        if (extratoObra) exportExtratoPDF(obraName, extratoObra.rows, extratoObra.totals, companyName)
      }
    } finally {
      setExporting(false)
    }
  }

  const canExport =
    (tab === "fluxo" && fluxo.length > 0) ||
    (tab === "contas_pagar" && contasPagar.length > 0) ||
    (tab === "extrato_obra" && !!extratoObra)

  const fluxoChart = fluxo.map(f => ({
    label: `${MONTH_SHORT[f.month.split("-")[1]] ?? f.month}`,
    receitas: Number(f.receitas),
    despesas: Number(f.despesas),
    // saldo já vem acumulado da API (initial_balance + movimentos pagos anteriores + mês atual)
    saldo: Number(f.saldo),
  }))

  const totalReceitas = fluxo.reduce((s,f) => s + Number(f.receitas), 0)
  const totalDespesas = fluxo.reduce((s,f) => s + Number(f.despesas), 0)
  const aReceber = fluxo.reduce((s,f) => s + Number(f.a_receber), 0)
  const aPagar   = fluxo.reduce((s,f) => s + Number(f.a_pagar),   0)

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/financeiro")} className="text-white/80 hover:text-white"><ArrowLeft size={22} /></button>
          <h1 className="text-white font-bold text-lg flex-1">Relatórios</h1>
          <button
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            {exporting
              ? <Loader2 size={13} className="animate-spin" />
              : <FileDown size={13} />}
            PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E0E0E0] overflow-x-auto scrollbar-hide">
        {([["fluxo","Fluxo de caixa"],["contas_pagar","Contas a pagar"],["extrato_obra","Extrato obra"]] as [Tab, string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab===v?"border-[#1565C0] text-[#1565C0]":"border-transparent text-[#9E9E9E]"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* ─── FLUXO DE CAIXA ─── */}
        {tab === "fluxo" && (
          <>
            {/* Período */}
            <div className="flex gap-2">
              {[3,6,12].map(n => (
                <button key={n} onClick={() => setFluxoMonths(n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${fluxoMonths===n?"bg-[#1565C0] text-white":"bg-white text-[#9E9E9E] shadow-sm"}`}>
                  {n} meses
                </button>
              ))}
            </div>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] text-[#9E9E9E] mb-0.5">Receitas pagas</p>
                <p className="font-bold text-[#1565C0] text-sm">{fmtBRL(totalReceitas)}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] text-[#9E9E9E] mb-0.5">Despesas pagas</p>
                <p className="font-bold text-[#D32F2F] text-sm">{fmtBRL(totalDespesas)}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] text-[#9E9E9E] mb-0.5">A receber</p>
                <p className="font-bold text-[#616161] text-sm">{fmtBRL(aReceber)}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] text-[#9E9E9E] mb-0.5">A pagar</p>
                <p className="font-bold text-[#616161] text-sm">{fmtBRL(aPagar)}</p>
              </div>
            </div>
            {/* Gráfico */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-sm text-[#212121] mb-3">Barras — Receitas vs Despesas</p>
              {loadingFluxo ? (
                <div className="h-48 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[#BDBDBD]" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fluxoChart} barCategoryGap="30%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} cursor={{ fill: "#F5F5F5" }} />
                    <Bar dataKey="receitas" name="Receitas" fill="#1565C0" radius={[4,4,0,0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#D32F2F" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Linha saldo */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-sm text-[#212121] mb-3">Linha — Saldo mensal</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={fluxoChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#1565C0" strokeWidth={2.5} dot={{ fill:"#1565C0", r:3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ─── CONTAS A PAGAR ─── */}
        {tab === "contas_pagar" && (
          <>
            {loadingCP ? (
              <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[#1565C0]" /></div>
            ) : contasPagar.length === 0 ? (
              <div className="text-center py-16 text-sm text-[#9E9E9E]">Nenhum lançamento pendente</div>
            ) : (
              <>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <p className="text-xs text-[#9E9E9E]">Total pendente</p>
                  <p className="font-bold text-[#212121]">{fmtBRL(contasPagar.reduce((s,c) => s+Number(c.amount), 0))}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {contasPagar.map(c => {
                    const hoje = new Date(); hoje.setHours(0,0,0,0)
                    const vencida = c.due_date && new Date(c.due_date + "T00:00:00") < hoje
                    return (
                      <button key={c.id} onClick={() => router.push(`/dashboard/financeiro/lancamentos/${c.id}`)}
                        className={`rounded-xl px-3 py-3 flex items-center gap-3 text-left w-full transition-all ${
                          vencida
                            ? "bg-[#FEE2E2] border border-[#D32F2F] shadow-[0_0_0_1px_#D32F2F20] hover:bg-[#FECACA]"
                            : "bg-white shadow-sm border border-transparent hover:shadow-md"
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${vencida ? "bg-[#D32F2F]" : "bg-[#F5F5F5]"}`}>
                          <TrendingDown size={13} className={vencida ? "text-white" : "text-[#D32F2F]"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${vencida ? "text-[#7F1D1D]" : "text-[#212121]"}`}>{c.description}</p>
                          <p className={`text-[10px] ${vencida ? "text-[#B91C1C]" : "text-[#9E9E9E]"}`}>{c.category_name ?? ""}{c.account_name ? ` · ${c.account_name}` : ""}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${vencida ? "text-[#7F1D1D]" : "text-[#D32F2F]"}`}>
                            {fmtBRL(Number(c.amount))}
                          </p>
                          <p className={`text-[10px] font-semibold ${vencida ? "text-[#B91C1C]" : "text-[#9E9E9E]"}`}>
                            {vencida ? "Vencida · " : ""}{fmtDate(c.due_date)}
                          </p>
                        </div>
                        <ChevronRight size={12} className={`flex-shrink-0 ${vencida ? "text-[#B91C1C]" : "text-[#BDBDBD]"}`} />
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── EXTRATO POR OBRA ─── */}
        {tab === "extrato_obra" && (
          <>
            <div>
              <p className="text-xs text-[#9E9E9E] mb-1.5">Selecione a obra</p>
              <select value={selectedObra}
                onChange={e => { setSelectedObra(e.target.value); if(e.target.value) fetchExtratoObra(e.target.value) }}
                className="w-full bg-white rounded-xl px-3 py-3 text-sm text-[#212121] outline-none shadow-sm">
                <option value="">Selecionar obra...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            {loadingEO ? (
              <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[#1565C0]" /></div>
            ) : extratoObra ? (
              <>
                {/* Totais */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-2xl p-3 shadow-sm">
                    <p className="text-[10px] text-[#9E9E9E] mb-0.5">Total receitas</p>
                    <p className="font-bold text-[#1565C0] text-sm">{fmtBRL(Number(extratoObra.totals?.total_receitas ?? 0))}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 shadow-sm">
                    <p className="text-[10px] text-[#9E9E9E] mb-0.5">Total despesas</p>
                    <p className="font-bold text-[#D32F2F] text-sm">{fmtBRL(Number(extratoObra.totals?.total_despesas ?? 0))}</p>
                  </div>
                </div>
                {/* Lista */}
                {extratoObra.rows.length === 0 ? (
                  <p className="text-center text-sm text-[#9E9E9E] py-8">Nenhuma transação nesta obra.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {extratoObra.rows.map((t: any) => (
                      <button key={t.id} onClick={() => router.push(`/dashboard/financeiro/lancamentos/${t.id}`)}
                        className="bg-white rounded-xl px-3 py-3 shadow-sm flex items-center gap-3 text-left hover:shadow-md w-full">
                        <div className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.type === "receita" ? "#1565C0" : "#D32F2F" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#212121] truncate">{t.description}</p>
                          <p className="text-[10px] text-[#9E9E9E]">{fmtDate(t.due_date)}{t.category_name ? ` · ${t.category_name}` : ""}</p>
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${t.type === "receita" ? "text-[#1565C0]" : "text-[#D32F2F]"}`}>
                          {t.type === "receita" ? "+" : "-"}{fmtBRL(Number(t.amount))}
                        </p>
                        <ChevronRight size={12} className="text-[#BDBDBD] flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : selectedObra ? null : (
              <div className="flex flex-col items-center gap-3 py-16 text-[#BDBDBD]">
                <Building2 size={36} />
                <p className="text-sm">Selecione uma obra para ver o extrato</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
