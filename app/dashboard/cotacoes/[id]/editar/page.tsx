"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Save, AlertCircle, Info } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface ItemForm {
  id?: string
  name: string
  unit: string
  quantity: string
}

interface CotacaoRaw {
  id: string
  identifier: string
  status: string
  need_date?: string
  expiry_date?: string
  general_notes?: string
  requester_name?: string
  requester_email?: string
  requester_phone?: string
  is_public: boolean
  obraplay_quotation_id?: number
  items: { id: string; name: string; unit: string; quantity: number }[]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[#616161] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const INPUT = "w-full rounded-xl border border-[#E0E0E0] bg-white px-3 py-2.5 text-sm text-[#212121] focus:outline-none focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] transition-colors placeholder:text-[#BDBDBD]"

export default function EditarCotacaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cotacao, setCotacao] = useState<CotacaoRaw | null>(null)

  // Campos editáveis
  const [needDate, setNeedDate]         = useState("")
  const [expiryDate, setExpiryDate]     = useState("")
  const [generalNotes, setGeneralNotes] = useState("")
  const [reqName, setReqName]           = useState("")
  const [reqEmail, setReqEmail]         = useState("")
  const [reqPhone, setReqPhone]         = useState("")
  const [isPublic, setIsPublic]         = useState(false)
  const [items, setItems]               = useState<ItemForm[]>([])

  useEffect(() => {
    if (!id) return
    authFetch(`/api/cotacoes/${id}`)
      .then(r => r.json())
      .then((d: CotacaoRaw) => {
        setCotacao(d)
        setNeedDate(d.need_date   ? d.need_date.slice(0, 10)   : "")
        setExpiryDate(d.expiry_date ? d.expiry_date.slice(0, 10) : "")
        setGeneralNotes(d.general_notes ?? "")
        setReqName(d.requester_name  ?? "")
        setReqEmail(d.requester_email ?? "")
        setReqPhone(d.requester_phone ?? "")
        setIsPublic(d.is_public ?? false)
        setItems(d.items.map(i => ({ id: i.id, name: i.name, unit: i.unit, quantity: String(i.quantity) })))
      })
      .catch(() => toast.error("Erro ao carregar cotação"))
      .finally(() => setLoading(false))
  }, [id])

  function addItem() {
    setItems(prev => [...prev, { name: "", unit: "un", quantity: "1" }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof ItemForm, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function handleSave() {
    if (items.some(i => !i.name.trim())) {
      toast.error("Preencha o nome de todos os itens.")
      return
    }
    setSaving(true)
    try {
      const res = await authFetch(`/api/cotacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obraplay_company_id: (activeCompany as any)?.obraplayCompanyId ?? null,
          need_date:      needDate    || null,
          expiry_date:    expiryDate  || null,
          general_notes:  generalNotes || null,
          requester_name:  reqName  || null,
          requester_email: reqEmail || null,
          requester_phone: reqPhone || null,
          is_public:      isPublic,
          items: items.map(i => ({
            name:     i.name,
            unit:     i.unit || "un",
            quantity: parseFloat(i.quantity) || 1,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")

      if (data._op_warning) {
        toast.success("Cotação editada localmente.")
        toast.error(data._op_warning, { duration: 6000 })
      } else {
        toast.success(data.obraplay_quotation_id
          ? "Cotação editada e reenviada ao ObraPlay."
          : "Cotação editada com sucesso.")
      }
      router.push(`/dashboard/cotacoes/${id}`)
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar cotação")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1565C0]" />
      </div>
    )
  }

  if (!cotacao) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-3 text-[#9E9E9E]">
        <AlertCircle size={36} strokeWidth={1.2} />
        <p className="text-sm">Cotação não encontrada.</p>
      </div>
    )
  }

  const canEdit = cotacao.status !== "Cancelada" && cotacao.status !== "Convertida"

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pb-10" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="h-1 w-full bg-[#1565C0]" />
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9E9E9E]">Editar cotação</p>
            <h1 className="font-bold text-[#212121] tracking-widest" style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
              {cotacao.identifier}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* Aviso de reenvio ObraPlay */}
        {cotacao.obraplay_quotation_id && (
          <div className="flex items-start gap-3 bg-[#FFF8E1] border border-[#FFD54F] rounded-xl px-4 py-3">
            <Info size={15} className="text-[#F57F17] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#6D4C41] leading-relaxed">
              Esta cotação foi enviada ao ObraPlay. Ao salvar, a cotação anterior será <strong>cancelada</strong> e uma nova será enviada automaticamente.
            </p>
          </div>
        )}

        {!canEdit && (
          <div className="flex items-start gap-3 bg-[#FFEBEE] border border-[#EF9A9A] rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-[#C62828] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#B71C1C]">
              Esta cotação não pode ser editada pois está com status <strong>{cotacao.status}</strong>.
            </p>
          </div>
        )}

        {/* Datas e solicitante */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F5F5F5]">
            <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Informações gerais</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data necessidade">
                <input type="date" value={needDate} onChange={e => setNeedDate(e.target.value)}
                  className={INPUT} disabled={!canEdit} />
              </Field>
              <Field label="Prazo resposta">
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className={INPUT} disabled={!canEdit} />
              </Field>
            </div>
            <Field label="Solicitante">
              <input value={reqName} onChange={e => setReqName(e.target.value)}
                placeholder="Nome do solicitante" className={INPUT} disabled={!canEdit} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail">
                <input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)}
                  placeholder="email@exemplo.com" className={INPUT} disabled={!canEdit} />
              </Field>
              <Field label="Telefone">
                <input value={reqPhone} onChange={e => setReqPhone(e.target.value)}
                  placeholder="(11) 99999-9999" className={INPUT} disabled={!canEdit} />
              </Field>
            </div>
            <Field label="Observações">
              <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
                rows={3} placeholder="Observações gerais..." disabled={!canEdit}
                className={INPUT + " resize-none"} />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => canEdit && setIsPublic(p => !p)}
                className={`w-9 h-5 rounded-full transition-colors relative ${isPublic ? "bg-[#1565C0]" : "bg-[#E0E0E0]"} ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-[#424242]">Cotação pública</span>
            </label>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F5F5F5] flex items-center justify-between">
            <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">Itens ({items.length})</p>
            {canEdit && (
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-[#1565C0] hover:opacity-70 transition-opacity">
                <Plus size={13} /> Adicionar
              </button>
            )}
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {items.length === 0 && (
              <p className="text-xs text-[#9E9E9E] py-2 text-center">Nenhum item. Adicione pelo menos um.</p>
            )}
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-2">
                  <input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)}
                    placeholder="Nome do item" className={INPUT} disabled={!canEdit} />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)}
                      placeholder="Unidade (un, kg...)" className={INPUT} disabled={!canEdit} />
                    <input type="number" min="0" step="any" value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", e.target.value)}
                      placeholder="Qtd" className={INPUT} disabled={!canEdit} />
                  </div>
                </div>
                {canEdit && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FFEBEE] text-[#EF5350] transition-colors mt-1 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botão salvar */}
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white bg-[#1565C0] hover:bg-[#1976D2] active:bg-[#0D47A1] disabled:opacity-60 transition-colors shadow-sm">
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
              : <><Save size={16} /> Salvar alterações</>
            }
          </button>
        )}

      </div>
    </div>
  )
}
