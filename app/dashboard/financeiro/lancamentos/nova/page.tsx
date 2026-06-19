"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Loader2, Check, ChevronDown, ToggleLeft, ToggleRight, CalendarDays, ShoppingCart,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { applyMoneyMask, parseBRL, formatMoneyInput } from "@/lib/money"
import { AnexosSection } from "@/components/financeiro/anexos-section"

interface Categoria { id: string; name: string; type: string; color: string | null }
interface Cliente   { id: string; full_name: string | null; fantasy_name: string | null; type: string }
interface Obra      { id: string; name: string }
interface Account   { id: string; name: string; color: string | null }

type TabType = "receita" | "despesa" | "transferencia"

// Gera preview de datas parceladas
function previewDates(baseDate: string, n: number): string[] {
  if (!baseDate || n <= 1) return []
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(baseDate)
    d.setMonth(d.getMonth() + i)
    out.push(d.toISOString().split("T")[0])
  }
  return out
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function Field({ label, children, divider = false }: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <div className={`px-4 ${divider ? "border-t border-[#F5F5F5]" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] mt-3 mb-0.5 font-semibold">{label}</p>
      {children}
    </div>
  )
}

export default function NovaLancamentoPage() {
  const router  = useRouter()
  const params  = useSearchParams()
  const editId  = params.get("edit")
  const typeQ   = (params.get("type") as TabType) ?? "despesa"
  const { activeCompany } = useAuth()

  const ocId           = params.get("oc_id")
  const ocAmount       = params.get("amount")
  const ocDesc         = params.get("description")
  const ocSupplierName = params.get("supplier_name")
  const ocObraId       = params.get("obra_id")
  const ocObraName     = params.get("obra_name")

  const [tab, setTab]         = useState<TabType>(typeQ)
  const [saving, setSaving]   = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [obras, setObras]           = useState<Obra[]>([])
  const [accounts, setAccounts]     = useState<Account[]>([])

  // Form
  const [description, setDesc]  = useState("")
  const [amount, setAmount]     = useState("")
  const [dueDate, setDueDate]   = useState(new Date().toISOString().split("T")[0])
  const [status, setStatus]     = useState<"pendente"|"pago">("pendente")
  const [paidAt, setPaidAt]     = useState("")
  const [catId, setCatId]       = useState("")
  const [accountId, setAccountId] = useState("")
  const [clientId, setClientId] = useState("")
  const [obraId, setObraId]     = useState("")
  const [notes, setNotes]       = useState("")

  // Parcelamento
  const [useInstallments, setUseInstallments] = useState(false)
  const [installments, setInstallments]       = useState(2)
  const datesPreview = useInstallments && dueDate ? previewDates(dueDate, installments) : []

  useEffect(() => {
    if (!activeCompany?.id) return
    Promise.all([
      authFetch(`/api/financeiro/categorias?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/clientes?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/obras?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/financeiro/contas?company_id=${activeCompany.id}`).then(r => r.json()),
    ]).then(([cats, cls, obs, acc]) => {
      setCategorias(Array.isArray(cats) ? cats : [])
      setClientes(Array.isArray(cls) ? cls : [])
      setObras(Array.isArray(obs) ? obs : obs?.obras ?? [])
      setAccounts(Array.isArray(acc) ? acc : [])
    }).catch(err => console.error("[nova-lancamento] meta:", err))
  }, [activeCompany?.id])

  // Pré-preenche via OC (oc_id + amount + description + obra_id nos query params)
  useEffect(() => {
    if (!ocId || editId) return
    if (ocDesc)   setDesc(ocDesc)
    if (ocObraId) setObraId(ocObraId)
    if (ocAmount) {
      const cents = Math.round(Number(ocAmount) * 100)
      if (cents > 0) setAmount(formatMoneyInput(cents))
    }
  }, [ocId, ocAmount, ocDesc, ocObraId, editId])

  useEffect(() => {
    if (!editId) return
    authFetch(`/api/financeiro/transacoes/${editId}`).then(r => r.json()).then(t => {
      setTab(t.type as TabType)
      setDesc(t.description)
      setAmount(formatMoneyInput(Math.round(Number(t.amount) * 100)))
      setDueDate(t.due_date ? t.due_date.split("T")[0] : "")
      setStatus(t.status === "pago" ? "pago" : "pendente")
      setPaidAt(t.paid_at ? t.paid_at.split("T")[0] : "")
      setCatId(t.category_id ?? "")
      setAccountId(t.account_id ?? "")
      setClientId(t.client_id ?? "")
      setObraId(t.obra_id ?? "")
      setNotes(t.notes ?? "")
    }).catch(err => {
      console.error("[nova-lancamento] editLoad:", err)
      toast.error("Erro ao carregar transação")
    }).finally(() => setLoadingEdit(false))
  }, [editId])

  const catsFiltradas = categorias.filter(c => c.type === tab || c.type === "ambos")

  async function handleSave() {
    if (!activeCompany?.id) return
    if (!description.trim()) { toast.error("Informe a descrição"); return }
    const amountNum = parseBRL(amount)
    if (amountNum <= 0) { toast.error("Informe um valor válido"); return }

    setSaving(true)
    try {
      const body: any = {
        company_id:  activeCompany.id,
        type:        tab === "transferencia" ? "despesa" : tab,
        description: description.trim(),
        amount:      amountNum,
        category_id: catId || null,
        account_id:  accountId || null,
        client_id:   clientId || null,
        obra_id:     obraId || null,
        due_date:    dueDate || null,
        paid_at:     status === "pago" ? (paidAt || new Date().toISOString().split("T")[0]) : null,
        status,
        recurrence:  "unica",
        notes:       notes.trim() || null,
        installments: useInstallments ? installments : 1,
      }
      const url    = editId ? `/api/financeiro/transacoes/${editId}` : "/api/financeiro/transacoes"
      const method = editId ? "PUT" : "POST"
      const res    = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")

      const firstId = data.id ?? data.rows?.[0]?.id
      toast.success(editId ? "Transação atualizada!" : useInstallments ? `${installments} parcelas criadas!` : "Transação criada!")
      if (useInstallments && !editId) {
        router.push("/dashboard/financeiro/lancamentos")
      } else {
        router.push(`/dashboard/financeiro/lancamentos/${editId ?? firstId}`)
      }
    } catch (err: any) {
      console.error("[nova-lancamento] erro:", err?.message)
      toast.error(err?.message ?? "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loadingEdit) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )



  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">{editId ? "Editar" : "Novo lançamento"}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 pb-32">

        {/* Banner: lançamento originado de OC */}
        {ocId && (
          <div className="bg-[#E3F2FD] rounded-2xl px-4 py-3 flex items-start gap-3">
            <ShoppingCart size={16} className="text-[#1565C0] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#1565C0]">Lançamento via Ordem de Compra</p>
              <p className="text-[11px] text-[#1565C0]/70 mt-0.5">
                Dados pré-preenchidos. Confirme ou ajuste antes de salvar.
              </p>
              {(ocSupplierName || ocObraName) && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {ocSupplierName && (
                    <p className="text-[11px] text-[#1565C0] font-medium">
                      Fornecedor: <span className="font-bold">{ocSupplierName}</span>
                    </p>
                  )}
                  {ocObraName && (
                    <p className="text-[11px] text-[#1565C0] font-medium">
                      Obra: <span className="font-bold">{ocObraName}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs: Receita | Despesa | Transferência */}
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          {(["receita", "despesa", "transferencia"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setCatId("") }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                tab === t
                  ? t === "receita" ? "bg-[#4CAF50] text-white"
                  : t === "despesa" ? "bg-[#F44336] text-white"
                  : "bg-[#1565C0] text-white"
                  : "text-[#9E9E9E]"
              }`}>
              {t === "receita" ? "Receita" : t === "despesa" ? "Despesa" : "Transferência"}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-semibold mb-1">Valor *</p>
          <div className="flex items-center gap-2">
            <span className="text-[#9E9E9E] font-bold text-lg">R$</span>
            <input
              type="text" inputMode="numeric" placeholder="0,00"
              value={amount} onChange={e => setAmount(applyMoneyMask(e.target.value))}
              className="flex-1 text-3xl font-bold text-[#212121] outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Campos principais */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Field label="Descrição *">
            <input className="w-full text-sm text-[#212121] outline-none bg-transparent py-2"
              placeholder="Ex: Pagamento fornecedor, recebimento cliente..."
              value={description} onChange={e => setDesc(e.target.value)} />
          </Field>

          <Field label="Data de competência" divider>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2" />
          </Field>

          <Field label="Status" divider>
            <div className="flex gap-2 py-2">
              {(["pendente","pago"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    status === s
                      ? s === "pago" ? "bg-[#E8F5E9] border-[#4CAF50] text-[#388E3C]" : "bg-[#FFF8E1] border-[#FFC107] text-[#F57F17]"
                      : "border-[#E0E0E0] text-[#9E9E9E]"
                  }`}>
                  {status === s && <Check size={10} />}{s === "pago" ? "Pago" : "Pendente"}
                </button>
              ))}
            </div>
          </Field>

          {status === "pago" && (
            <Field label="Data do pagamento" divider>
              <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                className="w-full text-sm text-[#212121] outline-none bg-transparent py-2" />
            </Field>
          )}
        </div>

        {/* Campos opcionais */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {tab !== "transferencia" && (
            <Field label="Categoria">
              <select value={catId} onChange={e => setCatId(e.target.value)}
                className="w-full text-sm text-[#212121] outline-none bg-transparent py-2 appearance-none">
                <option value="">Sem categoria</option>
                {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Conta" divider={tab !== "transferencia"}>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2 appearance-none">
              <option value="">Sem conta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Obra" divider>
            <select value={obraId} onChange={e => setObraId(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2 appearance-none">
              <option value="">Nenhuma obra</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>

          <Field label="Cliente" divider>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2 appearance-none">
              <option value="">Nenhum cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.type==="PF"?c.full_name:(c.fantasy_name??c.full_name)}</option>)}
            </select>
          </Field>
        </div>

        {/* Parcelamento */}
        {!editId && tab !== "transferencia" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#212121]">Parcelamento</p>
                <p className="text-[11px] text-[#9E9E9E]">Dividir em múltiplas parcelas mensais</p>
              </div>
              <button onClick={() => setUseInstallments(v => !v)} className="flex-shrink-0">
                {useInstallments
                  ? <ToggleRight size={28} className="text-[#1565C0]" />
                  : <ToggleLeft size={28} className="text-[#BDBDBD]" />}
              </button>
            </div>

            {useInstallments && (
              <div className="border-t border-[#F5F5F5] px-4 pb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] mt-3 mb-2 font-semibold">Número de parcelas</p>
                <div className="flex items-center gap-2">
                  <select value={installments} onChange={e => setInstallments(Number(e.target.value))}
                    className="flex-1 text-sm text-[#212121] bg-[#F5F5F5] rounded-xl px-3 py-2 outline-none">
                    {Array.from({length: 59}, (_,i) => i+2).map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                  {parseBRL(amount) > 0 && (
                    <div className="flex-1 text-right">
                      <p className="text-xs text-[#9E9E9E]">por parcela</p>
                      <p className="text-sm font-bold text-[#212121]">
                        R$ {(parseBRL(amount) / installments).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview datas */}
                {datesPreview.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CalendarDays size={12} className="text-[#9E9E9E]" />
                      <p className="text-[10px] text-[#9E9E9E] font-medium">Datas geradas</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {datesPreview.map((d, i) => (
                        <span key={i} className="text-[10px] bg-[#E3F2FD] text-[#1565C0] font-semibold px-2 py-0.5 rounded-full">
                          {i+1}. {fmtDate(d)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-semibold mb-1">Observações</p>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Informações adicionais..."
            className="w-full text-sm text-[#212121] outline-none bg-transparent resize-none" />
        </div>

        {/* Anexos — disponível na edição; no detalhe após criação */}
        {editId && activeCompany?.id && (
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <AnexosSection transactionId={editId} companyId={activeCompany.id} />
          </div>
        )}
      </div>

      {/* Botão salvar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-[#F5F5F5] border-t border-[#E0E0E0]">
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-2xl bg-[#1565C0] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0D47A1] transition-colors disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {saving ? "Salvando..." : editId ? "Salvar alterações" : useInstallments ? `Criar ${installments} parcelas` : "Criar lançamento"}
        </button>
      </div>
    </div>
  )
}
