"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, Check, X,
  Wallet, Tag, ChevronRight,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { applyMoneyMask, parseBRL, formatMoneyInput } from "@/lib/money"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Account {
  id: string; name: string; type: string; bank: string | null
  initial_balance: number; current_balance: number; color: string | null; is_active: boolean
}
interface Categoria {
  id: string; name: string; type: string; color: string | null; usage_count?: number
}

const ACCOUNT_TYPES = [
  { value: "corrente",   label: "Conta Corrente" },
  { value: "poupanca",   label: "Poupança" },
  { value: "caixa",      label: "Caixa" },
  { value: "cartao",     label: "Cartão" },
  { value: "outro",      label: "Outro" },
]
const COLORS = ["#1565C0","#4CAF50","#F44336","#FF9800","#9C27B0","#00BCD4","#607D8B","#795548","#E91E63","#FF5722"]

type Tab = "contas" | "categorias"
type CatType = "receita" | "despesa"

export default function ConfigFinanceiroPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [tab, setTab]     = useState<Tab>("contas")

  // ─── Contas ───────────────────────────────────
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [loadingAcc, setLoadingAcc]     = useState(true)
  const [showAccForm, setShowAccForm]   = useState(false)
  const [editAcc, setEditAcc]           = useState<Account | null>(null)
  const [accName, setAccName]           = useState("")
  const [accType, setAccType]           = useState("corrente")
  const [accBank, setAccBank]           = useState("")
  const [accBalance, setAccBalance]     = useState("")
  const [accColor, setAccColor]         = useState(COLORS[0])
  const [savingAcc, setSavingAcc]       = useState(false)
  const [confirmDeleteAcc, setConfirmDeleteAcc] = useState<Account | null>(null)
  const [deletingAcc, setDeletingAcc]   = useState(false)

  // ─── Categorias ───────────────────────────────
  const [categorias, setCategorias]     = useState<Categoria[]>([])
  const [loadingCat, setLoadingCat]     = useState(true)
  const [catTypeTab, setCatTypeTab]     = useState<CatType>("despesa")
  const [showCatForm, setShowCatForm]   = useState(false)
  const [editCat, setEditCat]           = useState<Categoria | null>(null)
  const [catName, setCatName]           = useState("")
  const [catType, setCatType]           = useState<CatType>("despesa")
  const [catColor, setCatColor]         = useState(COLORS[0])
  const [savingCat, setSavingCat]       = useState(false)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Categoria | null>(null)
  const [deletingCat, setDeletingCat]   = useState(false)

  const fetchAccounts = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoadingAcc(true)
    try {
      const res = await authFetch(`/api/financeiro/contas?company_id=${activeCompany.id}`)
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err) { console.error("[config-fin] contas:", err) }
    finally { setLoadingAcc(false) }
  }, [activeCompany?.id])

  const fetchCategorias = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoadingCat(true)
    try {
      const res = await authFetch(`/api/financeiro/categorias?company_id=${activeCompany.id}`)
      const data = await res.json()
      setCategorias(Array.isArray(data) ? data : [])
    } catch (err) { console.error("[config-fin] categorias:", err) }
    finally { setLoadingCat(false) }
  }, [activeCompany?.id])

  useEffect(() => { fetchAccounts(); fetchCategorias() }, [fetchAccounts, fetchCategorias])

  // ─── Conta handlers ───────────────────────────
  function openAccForm(acc?: Account) {
    setEditAcc(acc ?? null)
    setAccName(acc?.name ?? "")
    setAccType(acc?.type ?? "corrente")
    setAccBank(acc?.bank ?? "")
    setAccBalance(acc ? formatMoneyInput(Math.round(Number(acc.initial_balance) * 100)) : "")
    setAccColor(acc?.color ?? COLORS[0])
    setShowAccForm(true)
  }

  async function saveAccount() {
    if (!activeCompany?.id || !accName.trim()) { toast.error("Nome da conta obrigatório"); return }
    setSavingAcc(true)
    try {
      const body = { company_id: activeCompany.id, name: accName.trim(), type: accType, bank: accBank || null, initial_balance: parseBRL(accBalance), color: accColor }
      const url    = editAcc ? `/api/financeiro/contas/${editAcc.id}` : "/api/financeiro/contas"
      const method = editAcc ? "PUT" : "POST"
      const res = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editAcc ? "Conta atualizada" : "Conta criada")
      setShowAccForm(false)
      fetchAccounts()
    } catch (err: any) {
      console.error("[config-fin] saveAcc:", err?.message)
      toast.error(err?.message ?? "Erro ao salvar conta")
    } finally { setSavingAcc(false) }
  }

  async function deleteAccount() {
    if (!confirmDeleteAcc) return
    setDeletingAcc(true)
    try {
      const res  = await authFetch(`/api/financeiro/contas/${confirmDeleteAcc.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Conta excluída")
      setConfirmDeleteAcc(null)
      fetchAccounts()
    } catch (err: any) {
      console.error("[config-fin] deleteAcc:", err?.message)
      toast.error(err?.message ?? "Erro ao excluir")
    } finally { setDeletingAcc(false) }
  }

  // ─── Categoria handlers ───────────────────────
  function openCatForm(cat?: Categoria) {
    setEditCat(cat ?? null)
    setCatName(cat?.name ?? "")
    setCatType((cat?.type as CatType) ?? catTypeTab)
    setCatColor(cat?.color ?? COLORS[0])
    setShowCatForm(true)
  }

  async function saveCategoria() {
    if (!activeCompany?.id || !catName.trim()) { toast.error("Nome obrigatório"); return }
    setSavingCat(true)
    try {
      const body = { company_id: activeCompany.id, name: catName.trim(), type: catType, color: catColor }
      const url    = editCat ? `/api/financeiro/categorias/${editCat.id}` : "/api/financeiro/categorias"
      const method = editCat ? "PUT" : "POST"
      const res = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editCat ? "Categoria atualizada" : "Categoria criada")
      setShowCatForm(false)
      fetchCategorias()
    } catch (err: any) {
      console.error("[config-fin] saveCat:", err?.message)
      toast.error(err?.message ?? "Erro ao salvar")
    } finally { setSavingCat(false) }
  }

  async function deleteCategoria() {
    if (!confirmDeleteCat) return
    setDeletingCat(true)
    try {
      const res  = await authFetch(`/api/financeiro/categorias/${confirmDeleteCat.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Categoria excluída")
      setConfirmDeleteCat(null)
      fetchCategorias()
    } catch (err: any) {
      console.error("[config-fin] deleteCat:", err?.message)
      toast.error(err?.message ?? "Erro ao excluir")
    } finally { setDeletingCat(false) }
  }

  const catsFiltradas = categorias.filter(c => c.type === catTypeTab)

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white"><ArrowLeft size={22} /></button>
          <h1 className="text-white font-bold text-lg flex-1">Configurações</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E0E0E0] px-4">
        {([["contas","Contas"],["categorias","Categorias"]] as [Tab, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${tab===v?"border-[#1565C0] text-[#1565C0]":"border-transparent text-[#9E9E9E]"}`}>
            {v === "contas" ? <Wallet size={15} /> : <Tag size={15} />}{l}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">

        {/* ─── CONTAS ─── */}
        {tab === "contas" && (
          <>
            <button onClick={() => openAccForm()}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#BBDEFB] text-[#1565C0] font-semibold text-sm hover:bg-[#E3F2FD] transition-colors">
              <Plus size={16} />Nova conta
            </button>
            {loadingAcc ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-[#1565C0]" /></div>
            ) : accounts.length === 0 ? (
              <p className="text-center text-sm text-[#9E9E9E] py-8">Nenhuma conta cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {accounts.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: a.color ? `${a.color}20` : "#F5F5F5" }}>
                      <Wallet size={18} style={{ color: a.color ?? "#9E9E9E" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#212121] truncate">{a.name}</p>
                      <p className="text-[11px] text-[#9E9E9E]">{ACCOUNT_TYPES.find(t=>t.value===a.type)?.label ?? a.type}{a.bank ? ` · ${a.bank}` : ""}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: Number(a.current_balance) >= 0 ? "#1565C0" : "#D32F2F" }}>
                        Saldo: R$ {Number(a.current_balance).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openAccForm(a)} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#E3F2FD]"><Pencil size={13} className="text-[#616161]" /></button>
                      <button onClick={() => setConfirmDeleteAcc(a)} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#FFEBEE]"><Trash2 size={13} className="text-[#9E9E9E]" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── CATEGORIAS ─── */}
        {tab === "categorias" && (
          <>
            {/* Sub tabs tipo */}
            <div className="flex gap-2">
              {(["despesa","receita"] as CatType[]).map(t => (
                <button key={t} onClick={() => setCatTypeTab(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${catTypeTab===t?"bg-[#212121] text-white":"text-[#9E9E9E] bg-white shadow-sm"}`}>
                  {t === "despesa" ? "Despesas" : "Receitas"}
                </button>
              ))}
            </div>
            <button onClick={() => openCatForm()}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#BBDEFB] text-[#1565C0] font-semibold text-sm hover:bg-[#E3F2FD] transition-colors">
              <Plus size={16} />Nova categoria
            </button>
            {loadingCat ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-[#1565C0]" /></div>
            ) : catsFiltradas.length === 0 ? (
              <p className="text-center text-sm text-[#9E9E9E] py-8">Nenhuma categoria de {catTypeTab}.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {catsFiltradas.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: c.color ?? "#9E9E9E" }} />
                    <p className="flex-1 font-medium text-sm text-[#212121]">{c.name}</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => openCatForm(c)} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#E3F2FD]"><Pencil size={13} className="text-[#616161]" /></button>
                      <button onClick={() => setConfirmDeleteCat(c)} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#FFEBEE]"><Trash2 size={13} className="text-[#9E9E9E]" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Modal Form Conta ─── */}
      {showAccForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAccForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-[#E0E0E0]" /></div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="font-bold text-[#212121]">{editAcc ? "Editar conta" : "Nova conta"}</p>
              <button onClick={() => setShowAccForm(false)}><X size={20} className="text-[#9E9E9E]" /></button>
            </div>
            <div className="px-4 pb-6 flex flex-col gap-3">
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Nome *</p>
                <input value={accName} onChange={e => setAccName(e.target.value)} placeholder="Ex: Caixa, Nubank, Itaú..."
                  className="w-full bg-[#F5F5F5] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none" />
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Tipo</p>
                <select value={accType} onChange={e => setAccType(e.target.value)}
                  className="w-full bg-[#F5F5F5] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none">
                  {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Banco</p>
                <input value={accBank} onChange={e => setAccBank(e.target.value)} placeholder="Ex: Nubank, Bradesco..."
                  className="w-full bg-[#F5F5F5] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none" />
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Saldo inicial</p>
                <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2.5">
                  <span className="text-[#9E9E9E] text-sm font-semibold">R$</span>
                  <input type="text" inputMode="numeric" value={accBalance}
                    onChange={e => setAccBalance(applyMoneyMask(e.target.value))}
                    placeholder="0,00" className="flex-1 text-sm text-[#212121] outline-none bg-transparent" />
                </div>
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setAccColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}>
                      {accColor === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveAccount} disabled={savingAcc}
                className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#0D47A1] disabled:opacity-60">
                {savingAcc ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editAcc ? "Salvar alterações" : "Criar conta"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Confirmações de exclusão ─── */}
      <ConfirmDialog
        open={!!confirmDeleteAcc}
        title="Excluir conta?"
        description={`"${confirmDeleteAcc?.name}" será removida permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        loading={deletingAcc}
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDeleteAcc(null)}
      />
      <ConfirmDialog
        open={!!confirmDeleteCat}
        title="Excluir categoria?"
        description={`"${confirmDeleteCat?.name}" será removida permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        loading={deletingCat}
        onConfirm={deleteCategoria}
        onCancel={() => setConfirmDeleteCat(null)}
      />

      {/* ─── Modal Form Categoria ─── */}
      {showCatForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCatForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl">
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-[#E0E0E0]" /></div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="font-bold text-[#212121]">{editCat ? "Editar categoria" : "Nova categoria"}</p>
              <button onClick={() => setShowCatForm(false)}><X size={20} className="text-[#9E9E9E]" /></button>
            </div>
            <div className="px-4 pb-8 flex flex-col gap-3">
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Nome *</p>
                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Materiais, Serviços..."
                  className="w-full bg-[#F5F5F5] rounded-xl px-3 py-2.5 text-sm text-[#212121] outline-none" />
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Tipo</p>
                <div className="flex gap-2">
                  {(["despesa","receita"] as CatType[]).map(t => (
                    <button key={t} onClick={() => setCatType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${catType===t?"bg-[#212121] text-white":"bg-[#F5F5F5] text-[#9E9E9E]"}`}>
                      {t === "despesa" ? "Despesa" : "Receita"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[#9E9E9E] mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setCatColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}>
                      {catColor === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveCategoria} disabled={savingCat}
                className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#0D47A1] disabled:opacity-60">
                {savingCat ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {editCat ? "Salvar" : "Criar categoria"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
