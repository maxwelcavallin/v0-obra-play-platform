"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Search, SlidersHorizontal, TrendingUp, TrendingDown,
  Plus, X, ChevronLeft, ChevronRight, Tag, Building2, Loader2,
  ArrowRightLeft, ChevronRight as GoIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { fmtBRL } from "@/lib/money"

interface Transacao {
  id: string; description: string; amount: number
  type: "receita" | "despesa"
  status: "pendente" | "pago" | "cancelado"
  due_date: string | null; paid_at: string | null
  category_name: string | null; category_color: string | null
  account_name: string | null; account_color: string | null
  obra_name: string | null; client_name: string | null; client_fantasy: string | null
  installment_total: number | null; installment_index: number | null
}

interface Obra    { id: string; name: string }
interface Account { id: string; name: string; color: string | null }
interface Categoria { id: string; name: string; type: string; color: string | null }

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
function currentYM() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`
}
function fmtDate(d: string | null) {
  if (!d) return "—"
  const [y,m,day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

export default function LancamentosPage() {
  const router     = useRouter()
  const params     = useSearchParams()
  const { activeCompany } = useAuth()

  const [month, setMonth]       = useState(currentYM())
  const [search, setSearch]     = useState("")
  const [typeFilter, setType]   = useState<""|"receita"|"despesa">(params.get("type") as any ?? "")
  const [statusFilter, setStatus] = useState<""|"pendente"|"pago"|"cancelado">(params.get("status") as any ?? "")
  const [obraFilter, setObra]   = useState("")
  const [accountFilter, setAccount] = useState("")
  const [catFilter, setCat]     = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [fabOpen, setFabOpen]   = useState(false)

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [obras, setObras]           = useState<Obra[]>([])
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading]       = useState(true)

  function changeMonth(d: number) {
    const [y,m] = month.split("-").map(Number)
    const dt = new Date(y, m-1+d, 1)
    setMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`)
  }

  const fetchTransacoes = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ company_id: activeCompany.id, month })
      if (typeFilter)   qs.set("type", typeFilter)
      if (statusFilter) qs.set("status", statusFilter)
      if (obraFilter)   qs.set("obra_id", obraFilter)
      if (accountFilter) qs.set("account_id", accountFilter)
      if (search.trim()) qs.set("search", search.trim())
      const res = await authFetch(`/api/financeiro/transacoes?${qs}`)
      const data = await res.json()
      setTransacoes(Array.isArray(data) ? data : [])
    } catch (err) { console.error("[lancamentos] fetch:", err) }
    finally { setLoading(false) }
  }, [activeCompany?.id, month, typeFilter, statusFilter, obraFilter, accountFilter, search])

  useEffect(() => { fetchTransacoes() }, [fetchTransacoes])

  useEffect(() => {
    if (!activeCompany?.id) return
    Promise.all([
      authFetch(`/api/obras?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/financeiro/contas?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/financeiro/categorias?company_id=${activeCompany.id}`).then(r => r.json()),
    ]).then(([o, a, c]) => {
      setObras(Array.isArray(o) ? o : o?.obras ?? [])
      setAccounts(Array.isArray(a) ? a : [])
      setCategorias(Array.isArray(c) ? c : [])
    }).catch(err => console.error("[lancamentos] meta fetch:", err))
  }, [activeCompany?.id])

  // Saldo do período
  const totalReceitas  = transacoes.filter(t => t.type === "receita" && t.status === "pago").reduce((s,t) => s+Number(t.amount), 0)
  const totalDespesas  = transacoes.filter(t => t.type === "despesa" && t.status === "pago").reduce((s,t) => s+Number(t.amount), 0)
  const totalPendentes = transacoes.filter(t => t.status === "pendente").reduce((s,t) => s+Number(t.amount), 0)
  const saldo = totalReceitas - totalDespesas

  // filtros ativos
  const catFiltradas = catFilter ? transacoes.filter(t => t.category_name === categorias.find(c=>c.id===catFilter)?.name) : transacoes
  const filtered = catFiltradas
  const activeFilters = [typeFilter, statusFilter, obraFilter, accountFilter, catFilter].filter(Boolean).length

  const [y, m] = month.split("-").map(Number)
  const monthLabel = `${MONTH_NAMES[m-1]} ${y}`

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">

      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-3 sticky top-0 z-30">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white p-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Lançamentos</h1>
          <button onClick={() => setShowFilters(v => !v)}
            className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <SlidersHorizontal size={17} className="text-white" />
            {activeFilters > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF9800] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Navegação mês */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <button onClick={() => changeMonth(-1)} className="text-white/70 hover:text-white p-1"><ChevronLeft size={18} /></button>
          <span className="text-white font-semibold text-sm w-36 text-center">{monthLabel}</span>
          <button onClick={() => changeMonth(1)}  className="text-white/70 hover:text-white p-1"><ChevronRight size={18} /></button>
        </div>

        {/* Search */}
        <div className="bg-white/20 rounded-xl flex items-center gap-2 px-3 py-2">
          <Search size={14} className="text-white/60 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar descrição, cliente..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none" />
          {search && <button onClick={() => setSearch("")}><X size={14} className="text-white/60" /></button>}
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white border-b border-[#E0E0E0] px-4 py-3 flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            {/* Tipo */}
            {(["","receita","despesa"] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${typeFilter===t?"bg-[#1565C0] text-white border-[#1565C0]":"border-[#E0E0E0] text-[#616161]"}`}>
                {t===""?"Todos":t==="receita"?"Receitas":"Despesas"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Status */}
            {(["","pendente","pago","cancelado"] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter===s?"bg-[#1565C0] text-white border-[#1565C0]":"border-[#E0E0E0] text-[#616161]"}`}>
                {s===""?"Qualquer status":s==="pendente"?"Pendente":s==="pago"?"Pago":"Cancelado"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={obraFilter} onChange={e => setObra(e.target.value)}
              className="flex-1 text-xs text-[#212121] bg-[#F5F5F5] rounded-xl px-3 py-2 outline-none">
              <option value="">Todas as obras</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={accountFilter} onChange={e => setAccount(e.target.value)}
              className="flex-1 text-xs text-[#212121] bg-[#F5F5F5] rounded-xl px-3 py-2 outline-none">
              <option value="">Todas as contas</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <select value={catFilter} onChange={e => setCat(e.target.value)}
            className="text-xs text-[#212121] bg-[#F5F5F5] rounded-xl px-3 py-2 outline-none w-full">
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setType(""); setStatus(""); setObra(""); setAccount(""); setCat("") }}
              className="text-xs text-[#F44336] font-medium self-start">Limpar filtros</button>
          )}
        </div>
      )}

      {/* Lista extrato */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-1.5 pb-40">
        {loading && (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1565C0]" /></div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <TrendingUp size={36} className="text-[#E0E0E0]" />
            <p className="text-[#9E9E9E] text-sm">Nenhum lançamento encontrado</p>
          </div>
        )}
        {!loading && filtered.map((t, idx) => {
          // Cabeçalho de data
          const prevDate = idx > 0 ? filtered[idx-1].due_date?.split("T")[0] : null
          const thisDate = t.due_date?.split("T")[0] ?? null
          const showDateHeader = thisDate !== prevDate
          const isVencida = t.status === "pendente" && t.due_date && new Date(t.due_date) < new Date()

          return (
            <div key={t.id}>
              {showDateHeader && thisDate && (
                <p className="text-[10px] font-semibold text-[#9E9E9E] uppercase tracking-wider pt-2 pb-1 px-1">
                  {fmtDate(t.due_date)}
                </p>
              )}
              <button onClick={() => router.push(`/dashboard/financeiro/lancamentos/${t.id}`)}
                className="w-full bg-white rounded-xl px-3 py-3 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow">
                {/* Ícone tipo */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: t.type === "receita" ? "#E8F5E9" : "#FFEBEE" }}>
                  {t.type === "receita"
                    ? <TrendingUp size={14} className="text-[#4CAF50]" />
                    : <TrendingDown size={14} className="text-[#F44336]" />}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Linha 1: descrição */}
                  <p className="text-sm font-medium text-[#212121] truncate">{t.description}
                    {t.installment_total && t.installment_total > 1 && (
                      <span className="ml-1 text-[10px] text-[#9E9E9E]">({t.installment_index}/{t.installment_total})</span>
                    )}
                  </p>
                  {/* Linha 2: categoria chip + obra + conta */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {t.category_name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: t.category_color ? `${t.category_color}20` : "#F5F5F5", color: t.category_color ?? "#9E9E9E" }}>
                        <Tag size={8} className="inline mr-0.5" />{t.category_name}
                      </span>
                    )}
                    {t.obra_name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E3F2FD] text-[#1565C0] font-medium">
                        <Building2 size={8} className="inline mr-0.5" />{t.obra_name}
                      </span>
                    )}
                    {t.account_name && (
                      <span className="text-[10px] text-[#9E9E9E]">{t.account_name}</span>
                    )}
                  </div>
                </div>
                {/* Valor + status */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="font-bold text-sm" style={{ color: t.type === "receita" ? "#4CAF50" : "#F44336" }}>
                    {t.type === "receita" ? "+" : "-"}{fmtBRL(Number(t.amount))}
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: t.status==="pago"?"#E8F5E9":t.status==="cancelado"?"#FFEBEE":isVencida?"#FFF3E0":"#FFF8E1",
                      color: t.status==="pago"?"#388E3C":t.status==="cancelado"?"#D32F2F":isVencida?"#E65100":"#F57F17",
                    }}>
                    {t.status==="pago"?"Pago":t.status==="cancelado"?"Cancelado":isVencida?"Vencida":"Pendente"}
                  </span>
                </div>
                <GoIcon size={12} className="text-[#BDBDBD] flex-shrink-0" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Rodapé — saldo do período */}
      <div className="fixed bottom-20 left-0 right-0 mx-4 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4 border border-[#E0E0E0] z-20">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#9E9E9E]">Receitas</p>
          <p className="text-xs font-bold text-[#4CAF50]">+{fmtBRL(totalReceitas)}</p>
        </div>
        <div className="w-px h-8 bg-[#F0F0F0]" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#9E9E9E]">Despesas</p>
          <p className="text-xs font-bold text-[#F44336]">-{fmtBRL(totalDespesas)}</p>
        </div>
        <div className="w-px h-8 bg-[#F0F0F0]" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#9E9E9E]">Saldo</p>
          <p className="text-xs font-bold" style={{ color: saldo >= 0 ? "#1565C0" : "#F44336" }}>{fmtBRL(saldo)}</p>
        </div>
        {totalPendentes > 0 && (
          <>
            <div className="w-px h-8 bg-[#F0F0F0]" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#9E9E9E]">Pendente</p>
              <p className="text-xs font-bold text-[#FF9800]">{fmtBRL(totalPendentes)}</p>
            </div>
          </>
        )}
      </div>

      {/* FAB expandido */}
      {fabOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
      )}
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
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${fabOpen ? "bg-[#616161] rotate-45" : "bg-[#1565C0]"}`}>
          <Plus size={24} className="text-white" />
        </button>
      </div>

    </div>
  )
}
