"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface Categoria { id: string; name: string; type: string; color: string | null }
interface Cliente   { id: string; full_name: string | null; fantasy_name: string | null; type: string }

const LABEL: Record<string, string> = {
  unica: "Única", mensal: "Mensal", semanal: "Semanal", anual: "Anual",
}

export default function NovaTransacaoPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const editId       = params.get("edit") // /nova?edit=<id> para editar
  const { activeCompany } = useAuth()

  const [saving, setSaving]           = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const [categorias, setCategorias]   = useState<Categoria[]>([])
  const [clientes, setClientes]       = useState<Cliente[]>([])

  // Form state
  const [type, setType]             = useState<"receita" | "despesa">("despesa")
  const [description, setDescription] = useState("")
  const [amount, setAmount]         = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [clientId, setClientId]     = useState("")
  const [dueDate, setDueDate]       = useState("")
  const [status, setStatus]         = useState<"pendente" | "pago">("pendente")
  const [paidAt, setPaidAt]         = useState("")
  const [recurrence, setRecurrence] = useState("unica")
  const [notes, setNotes]           = useState("")

  // Carrega categorias e clientes
  useEffect(() => {
    if (!activeCompany?.id) return
    Promise.all([
      authFetch(`/api/financeiro/categorias?company_id=${activeCompany.id}`).then(r => r.json()),
      authFetch(`/api/clientes?company_id=${activeCompany.id}`).then(r => r.json()),
    ]).then(([cats, cls]) => {
      console.log("[nova-transacao] categorias:", cats.length, "clientes:", cls.length)
      setCategorias(Array.isArray(cats) ? cats : [])
      setClientes(Array.isArray(cls) ? cls : [])
    }).catch(err => console.error("[nova-transacao] erro ao carregar dados:", err))
  }, [activeCompany?.id])

  // Carrega transação para edição
  useEffect(() => {
    if (!editId) return
    authFetch(`/api/financeiro/transacoes/${editId}`)
      .then(r => r.json())
      .then(t => {
        console.log("[nova-transacao] editando:", t.id)
        setType(t.type)
        setDescription(t.description)
        setAmount(String(t.amount))
        setCategoryId(t.category_id ?? "")
        setClientId(t.client_id ?? "")
        setDueDate(t.due_date ? t.due_date.split("T")[0] : "")
        setStatus(t.status === "pago" ? "pago" : "pendente")
        setPaidAt(t.paid_at ? t.paid_at.split("T")[0] : "")
        setRecurrence(t.recurrence ?? "unica")
        setNotes(t.notes ?? "")
      })
      .catch(err => {
        console.error("[nova-transacao] erro ao carregar edição:", err)
        toast.error("Erro ao carregar transação")
      })
      .finally(() => setLoadingEdit(false))
  }, [editId])

  const catsFiltradas = categorias.filter(c => c.type === type)

  async function handleSave() {
    if (!activeCompany?.id) return
    if (!description.trim()) { toast.error("Informe a descrição"); return }
    const amountNum = parseFloat(amount.replace(",", "."))
    if (!amount || isNaN(amountNum) || amountNum <= 0) { toast.error("Informe um valor válido"); return }

    setSaving(true)
    try {
      const body = {
        company_id:  activeCompany.id,
        type, description: description.trim(),
        amount: amountNum,
        category_id: categoryId || null,
        client_id:   clientId   || null,
        due_date:    dueDate    || null,
        paid_at:     status === "pago" ? (paidAt || new Date().toISOString().split("T")[0]) : null,
        status,
        recurrence,
        notes: notes.trim() || null,
      }
      console.log("[nova-transacao] salvando:", JSON.stringify(body))

      const url    = editId ? `/api/financeiro/transacoes/${editId}` : "/api/financeiro/transacoes"
      const method = editId ? "PUT" : "POST"
      const res    = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data   = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      toast.success(editId ? "Transação atualizada!" : "Transação criada!")
      router.push(`/dashboard/financeiro/${data.id}`)
    } catch (err: any) {
      console.error("[nova-transacao] erro ao salvar:", err?.message)
      toast.error(err?.message ?? "Erro ao salvar transação")
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
      <div className="bg-[#1565C0] px-4 pt-4 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1">
          {editId ? "Editar transação" : "Nova transação"}
        </h1>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4 pb-32">

        {/* Tipo: Receita / Despesa */}
        <div className="bg-white rounded-2xl p-1 flex shadow-sm">
          {(["despesa", "receita"] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setCategoryId("") }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                type === t
                  ? t === "receita" ? "bg-[#4CAF50] text-white" : "bg-[#F44336] text-white"
                  : "text-[#9E9E9E]"
              }`}>
              {t === "receita" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
          <p className="text-xs text-[#9E9E9E] mb-1">Valor *</p>
          <div className="flex items-center gap-2">
            <span className="text-[#616161] text-sm">R$</span>
            <input
              type="number" inputMode="decimal" step="0.01" min="0"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-2xl font-bold text-[#212121] outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-white rounded-2xl shadow-sm">
          <Field label="Descrição *">
            <input
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2"
              placeholder="Ex: Pagamento fornecedor, recebimento cliente..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </Field>

          {/* Categoria */}
          <Field label="Categoria" divider>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2">
              <option value="">Sem categoria</option>
              {catsFiltradas.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Cliente */}
          <Field label="Cliente" divider>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2">
              <option value="">Nenhum</option>
              {clientes.map(c => {
                const name = c.type === "PF" ? c.full_name : (c.fantasy_name ?? c.full_name)
                return <option key={c.id} value={c.id}>{name}</option>
              })}
            </select>
          </Field>

          {/* Recorrência */}
          <Field label="Recorrência" divider>
            <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2">
              {Object.entries(LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>

        {/* Datas e status */}
        <div className="bg-white rounded-2xl shadow-sm">
          <Field label="Data de vencimento">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full text-sm text-[#212121] outline-none bg-transparent py-2" />
          </Field>

          <Field label="Status" divider>
            <div className="flex gap-3 py-2">
              {(["pendente", "pago"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    status === s
                      ? s === "pago" ? "bg-[#E8F5E9] border-[#4CAF50] text-[#388E3C]" : "bg-[#FFF8E1] border-[#FFC107] text-[#F57F17]"
                      : "border-[#E0E0E0] text-[#9E9E9E]"
                  }`}>
                  {status === s && <Check size={11} />}
                  {s === "pago" ? "Pago" : "Pendente"}
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

        {/* Observações */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-[#9E9E9E] mb-1">Observações</p>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Informações adicionais..."
            className="w-full text-sm text-[#212121] outline-none bg-transparent resize-none" />
        </div>
      </div>

      {/* Botão salvar fixo */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-[#F5F5F5]">
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-2xl bg-[#1565C0] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0D47A1] transition-colors disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {saving ? "Salvando..." : editId ? "Salvar alterações" : "Criar transação"}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, divider }: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <div className={`px-4 ${divider ? "border-t border-[#F5F5F5]" : ""}`}>
      <p className="text-xs text-[#9E9E9E] mt-3 mb-0.5">{label}</p>
      {children}
    </div>
  )
}
