"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Loader2, Pencil, Trash2, CheckCircle, XCircle,
  TrendingUp, TrendingDown, User, Tag, Calendar, RefreshCw, FileText,
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"
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
  notes: string | null
  created_at: string
  category_name: string | null
  category_color: string | null
  client_name: string | null
  client_fantasy: string | null
}

const RECURRENCE_LABEL: Record<string, string> = {
  unica: "Única", mensal: "Mensal", semanal: "Semanal", anual: "Anual",
}

function fmtData(d: string | null) {
  if (!d) return "—"
  const [y, m, day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
      <div className="text-[#9E9E9E] mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#212121] mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function TransacaoDetalhePage() {
  const router    = useRouter()
  const { id }    = useParams<{ id: string }>()

  const [transacao, setTransacao]     = useState<Transacao | null>(null)
  const [loading, setLoading]         = useState(true)
  const [marking, setMarking]         = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/financeiro/transacoes/${id}`)
      .then(r => r.json())
      .then(data => {
        console.log("[financeiro/detalhe] transacao:", data.id, "status:", data.status)
        if (data.error) { toast.error("Transação não encontrada"); router.back(); return }
        setTransacao(data)
      })
      .catch(err => {
        console.error("[financeiro/detalhe] erro:", err)
        toast.error("Erro ao carregar transação")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleMarkPago() {
    if (!transacao) return
    const newStatus = transacao.status === "pago" ? "pendente" : "pago"
    setMarking(true)
    try {
      const res  = await authFetch(`/api/financeiro/transacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro")
      setTransacao(prev => prev ? { ...prev, status: newStatus, paid_at: data.paid_at } : prev)
      toast.success(newStatus === "pago" ? "Marcado como pago!" : "Marcado como pendente!")
    } catch (err: any) {
      console.error("[financeiro/detalhe] erro ao marcar pago:", err)
      toast.error(err?.message ?? "Erro ao atualizar")
    } finally {
      setMarking(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await authFetch(`/api/financeiro/transacoes/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success("Transação excluída")
      router.push("/dashboard/financeiro")
    } catch (err: any) {
      console.error("[financeiro/detalhe] erro ao excluir:", err)
      toast.error(err?.message ?? "Erro ao excluir")
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )
  if (!transacao) return null

  const isVencida = transacao.status === "pendente" && transacao.due_date && new Date(transacao.due_date) < new Date()
  const clientName = transacao.client_fantasy ?? transacao.client_name

  const statusCfg = transacao.status === "pago"
    ? { label: "Pago", bg: "#E8F5E9", color: "#388E3C" }
    : transacao.status === "cancelado"
    ? { label: "Cancelado", bg: "#FFEBEE", color: "#D32F2F" }
    : isVencida
    ? { label: "Vencida", bg: "#FFF3E0", color: "#E65100" }
    : { label: "Pendente", bg: "#FFF8E1", color: "#F57F17" }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pb-10">

      {/* Modal de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: 480 }}>
            <div className="px-5 pt-5 pb-4 border-b border-[#F5F5F5]">
              <h2 className="font-bold text-[#212121] text-base">Excluir transação</h2>
              <p className="text-xs text-[#9E9E9E] mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="px-5 py-4 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#E0E0E0] text-sm text-[#616161] font-medium">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-[#F44336] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-16">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-semibold text-base flex-1 truncate">{transacao.description}</h1>
          <button onClick={() => router.push(`/dashboard/financeiro/nova?edit=${id}`)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <Pencil size={16} className="text-white" />
          </button>
          <button onClick={() => setShowDeleteModal(true)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <Trash2 size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Card principal sobrepostos */}
      <div className="px-4 -mt-12 mb-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
            style={{ backgroundColor: transacao.type === "receita" ? "#E8F5E9" : "#FFEBEE" }}>
            {transacao.type === "receita"
              ? <TrendingUp size={24} className="text-[#4CAF50]" />
              : <TrendingDown size={24} className="text-[#F44336]" />}
          </div>
          <p className="text-3xl font-bold" style={{ color: transacao.type === "receita" ? "#4CAF50" : "#F44336" }}>
            {transacao.type === "receita" ? "+" : "-"}{fmtBRL(Number(transacao.amount))}
          </p>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Detalhes */}
      <div className="px-4 flex flex-col gap-3">
        <div className="bg-white rounded-2xl shadow-sm px-4">
          {transacao.category_name && (
            <Row icon={<Tag size={16} />} label="Categoria" value={transacao.category_name} />
          )}
          {clientName && (
            <Row icon={<User size={16} />} label="Cliente" value={clientName} />
          )}
          {transacao.due_date && (
            <Row icon={<Calendar size={16} />} label="Vencimento" value={fmtData(transacao.due_date)} />
          )}
          {transacao.paid_at && (
            <Row icon={<CheckCircle size={16} />} label="Pago em" value={fmtData(transacao.paid_at)} />
          )}
          {transacao.recurrence && transacao.recurrence !== "unica" && (
            <Row icon={<RefreshCw size={16} />} label="Recorrência" value={RECURRENCE_LABEL[transacao.recurrence] ?? transacao.recurrence} />
          )}
          {transacao.notes && (
            <Row icon={<FileText size={16} />} label="Observações" value={transacao.notes} />
          )}
          <Row icon={<Calendar size={16} />} label="Criada em" value={fmtData(transacao.created_at)} />
        </div>

        {/* Botão marcar como pago */}
        {transacao.status !== "cancelado" && (
          <button onClick={handleMarkPago} disabled={marking}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
              transacao.status === "pago"
                ? "border-2 border-[#9E9E9E] text-[#9E9E9E] bg-white"
                : "bg-[#4CAF50] text-white hover:bg-[#388E3C]"
            }`}>
            {marking
              ? <Loader2 size={16} className="animate-spin" />
              : transacao.status === "pago"
              ? <XCircle size={16} />
              : <CheckCircle size={16} />}
            {marking ? "Atualizando..." : transacao.status === "pago" ? "Desfazer pagamento" : "Marcar como pago"}
          </button>
        )}

        {/* Botão editar */}
        <button onClick={() => router.push(`/dashboard/financeiro/nova?edit=${id}`)}
          className="w-full py-4 rounded-2xl border border-[#1565C0] text-[#1565C0] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#E3F2FD] transition-colors">
          <Pencil size={16} />
          Editar transação
        </button>
      </div>
    </div>
  )
}
