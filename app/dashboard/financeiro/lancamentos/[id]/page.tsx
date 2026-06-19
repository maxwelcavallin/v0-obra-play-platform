"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Check, Pencil, Trash2, TrendingUp, TrendingDown,
  Tag, Building2, User, Wallet, AlignLeft, Calendar, RotateCcw, Layers,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
import { fmtBRL } from "@/lib/money"
import { AnexosSection, type Anexo } from "@/components/financeiro/anexos-section"

interface Transacao {
  id: string; description: string; amount: number
  type: "receita" | "despesa"; status: "pendente" | "pago" | "cancelado"
  due_date: string | null; paid_at: string | null; recurrence: string | null
  notes: string | null; category_name: string | null; category_color: string | null
  account_name: string | null; obra_name: string | null
  client_name: string | null; client_fantasy: string | null
  installment_total: number | null; installment_index: number | null
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  const [y,m,day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
      <div className="mt-0.5 text-[#BDBDBD] flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-semibold">{label}</p>
        <p className="text-sm text-[#212121] font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function LancamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const { activeCompany } = useAuth()

  const [transacao, setTransacao] = useState<Transacao | null>(null)
  const [anexos, setAnexos]       = useState<Anexo[]>([])
  const [loading, setLoading]     = useState(true)
  const [patching, setPatching]   = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [tRes, aRes] = await Promise.all([
          authFetch(`/api/financeiro/transacoes/${id}`),
          authFetch(`/api/financeiro/transacoes/${id}/anexos`),
        ])
        const t = await tRes.json()
        const a = await aRes.json()
        if (!tRes.ok) throw new Error(t.error ?? "Erro ao carregar")
        setTransacao(t)
        setAnexos(Array.isArray(a) ? a : [])
      } catch (err: any) {
        console.error("[lancamento-detalhe] load:", err?.message)
        toast.error("Erro ao carregar lançamento")
        router.back()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function togglePago() {
    if (!transacao) return
    const novoStatus = transacao.status === "pago" ? "pendente" : "pago"
    setPatching(true)
    try {
      const res = await authFetch(`/api/financeiro/transacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, paid_at: novoStatus === "pago" ? new Date().toISOString().split("T")[0] : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTransacao(p => p ? { ...p, status: novoStatus, paid_at: novoStatus === "pago" ? new Date().toISOString() : null } : p)
      toast.success(novoStatus === "pago" ? "Marcado como pago!" : "Marcado como pendente")
    } catch (err: any) {
      console.error("[lancamento-detalhe] patch:", err?.message)
      toast.error("Erro ao atualizar status")
    } finally {
      setPatching(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await authFetch(`/api/financeiro/transacoes/${id}`, { method: "DELETE" })
      toast.success("Lançamento excluído")
      router.push("/dashboard/financeiro/lancamentos")
    } catch (err: any) {
      console.error("[lancamento-detalhe] delete:", err?.message)
      toast.error("Erro ao excluir")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )
  if (!transacao) return null

  const isVencida = transacao.status === "pendente" && transacao.due_date && new Date(transacao.due_date) < new Date()
  const isReceita = transacao.type === "receita"
  const amountColor = isReceita ? "#1565C0" : "#D32F2F"

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header — azul único para ambos os tipos */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white p-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1 truncate">{transacao.description}</h1>
          <button onClick={() => router.push(`/dashboard/financeiro/lancamentos/nova?edit=${id}`)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <Pencil size={16} className="text-white" />
          </button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/60 text-xs mb-0.5">{isReceita ? "Receita" : "Despesa"}</p>
            <p className="text-3xl font-bold text-white">
              {isReceita ? "+" : "-"}{fmtBRL(Number(transacao.amount))}
            </p>
            {transacao.installment_total && transacao.installment_total > 1 && (
              <p className="text-white/60 text-xs mt-0.5">Parcela {transacao.installment_index} de {transacao.installment_total}</p>
            )}
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white">
            {transacao.status==="pago"?"Pago":transacao.status==="cancelado"?"Cancelado":isVencida?"Vencida":"Pendente"}
          </span>
        </div>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-3 pb-28">

        {/* Tipo do lançamento — indicador discreto */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isReceita ? "bg-[#EEF2FA]" : "bg-[#FEF0F0]"}`}>
            {isReceita
              ? <TrendingUp size={16} className="text-[#1565C0]" />
              : <TrendingDown size={16} className="text-[#D32F2F]" />}
          </div>
          <div>
            <p className="text-xs text-[#9E9E9E]">Tipo</p>
            <p className="text-sm font-semibold" style={{ color: amountColor }}>{isReceita ? "Receita" : "Despesa"}</p>
          </div>
        </div>

        {/* Ação principal */}
        {transacao.status !== "cancelado" && (
          <button onClick={togglePago} disabled={patching}
            className={`w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-colors ${
              transacao.status === "pago"
                ? "bg-[#616161] hover:bg-[#424242]"
                : "bg-[#212121] hover:bg-[#000000]"
            }`}>
            {patching ? <Loader2 size={16} className="animate-spin" /> : transacao.status === "pago" ? <RotateCcw size={16} /> : <Check size={16} />}
            {transacao.status === "pago" ? "Desfazer pagamento" : "Marcar como pago"}
          </button>
        )}

        {/* Detalhes */}
        <div className="bg-white rounded-2xl px-4 shadow-sm">
          <InfoRow icon={<Calendar size={15} />} label="Vencimento" value={fmtDate(transacao.due_date)} />
          {transacao.status === "pago" && transacao.paid_at && (
            <InfoRow icon={<Check size={15} />} label="Pago em" value={fmtDate(transacao.paid_at)} />
          )}
          {transacao.category_name && (
            <div className="flex items-start gap-3 py-2.5 border-b border-[#F5F5F5]">
              <Tag size={15} className="text-[#BDBDBD] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9E9E9E] font-semibold">Categoria</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block"
                  style={{
                    backgroundColor: transacao.category_color ? `${transacao.category_color}18` : "#F5F5F5",
                    color: transacao.category_color ?? "#616161",
                  }}>
                  {transacao.category_name}
                </span>
              </div>
            </div>
          )}
          <InfoRow icon={<Wallet size={15} />}    label="Conta"       value={transacao.account_name} />
          <InfoRow icon={<Building2 size={15} />} label="Obra"        value={transacao.obra_name} />
          {(transacao.client_name || transacao.client_fantasy) && (
            <InfoRow icon={<User size={15} />} label="Cliente" value={transacao.client_fantasy ?? transacao.client_name} />
          )}
          <InfoRow icon={<AlignLeft size={15} />} label="Observações" value={transacao.notes} />
          {transacao.recurrence && transacao.recurrence !== "unica" && (
            <InfoRow icon={<Layers size={15} />} label="Recorrência" value={transacao.recurrence} />
          )}
        </div>

        {/* Anexos */}
        {activeCompany?.id && (
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <AnexosSection transactionId={id} companyId={activeCompany.id} initialAnexos={anexos} />
          </div>
        )}

        {/* Excluir */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-2xl border border-[#E0E0E0] text-[#9E9E9E] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#F5F5F5] transition-colors">
            <Trash2 size={15} />Excluir lançamento
          </button>
        ) : (
          <div className="bg-[#F5F5F5] rounded-2xl px-4 py-3 flex flex-col gap-2 border border-[#E0E0E0]">
            <p className="text-sm font-semibold text-[#212121] text-center">Confirmar exclusão?</p>
            <p className="text-xs text-[#9E9E9E] text-center">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E0E0E0] text-[#616161] text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-[#D32F2F] text-white text-sm font-semibold flex items-center justify-center gap-1">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
