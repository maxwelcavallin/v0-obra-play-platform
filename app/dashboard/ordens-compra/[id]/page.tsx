"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, AlertCircle, Building2, User,
  Phone, Mail, MapPin, Package, DollarSign, Paperclip, TrendingUp, XCircle
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface OC {
  id: string
  identifier: string
  supplier_name: string
  supplier_cnpj?: string
  supplier_email?: string
  supplier_phone?: string
  cotacao_identifier?: string
  obraplay_quotation_code?: string
  obra_name?: string
  delivery_street?: string
  delivery_number?: string
  delivery_neighbourhood?: string
  delivery_city?: string
  delivery_state?: string
  delivery_zipcode?: string
  company_name?: string
  company_cnpj?: string
  company_street?: string
  company_number?: string
  company_city?: string
  company_state?: string
  items: any[]
  subtotal: number
  freight: number
  total: number
  payment_method?: number | null
  arrival_estimate?: string | null
  status: string
  created_at: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "Aguardando fornecedor": { label: "Aguardando fornecedor", color: "#FF9800", bg: "#FFF3E0" },
  "Em processamento":      { label: "Em processamento",      color: "#1565C0", bg: "#E3F2FD" },
  "Entrega confirmada":    { label: "Entrega confirmada",    color: "#4CAF50", bg: "#E8F5E9" },
  "Processada":            { label: "Processada",            color: "#4CAF50", bg: "#E8F5E9" },
  "Recusada":              { label: "Recusada",              color: "#F44336", bg: "#FFEBEE" },
  "Cancelada":             { label: "Cancelada",             color: "#F44336", bg: "#FFEBEE" },
}

const PAYMENT_LABELS: Record<number, string> = {
  1: "À vista", 2: "Boleto 30 dias", 3: "Boleto 60 dias", 4: "Cartão", 5: "Pix", 6: "Outro"
}

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F5F5F5] flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#1565C0]" />}
        <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[#F5F5F5] last:border-0">
      <span className="text-xs text-[#9E9E9E] flex-shrink-0">{label}</span>
      <span className="text-xs text-[#212121] text-right font-medium">{value}</span>
    </div>
  )
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OC: OC = {
  id: "mock",
  identifier: "OC-ZMSDNDL",
  supplier_name: "Fornecedor Exemplo Ltda.",
  supplier_cnpj: "12.345.678/0001-99",
  supplier_email: "contato@fornecedor.com.br",
  supplier_phone: "(11) 99999-9999",
  cotacao_identifier: "COT-001",
  obra_name: "Nova obra Joao Pizzini",
  delivery_street: "Rua das Obras",
  delivery_number: "123",
  delivery_neighbourhood: "Centro",
  delivery_city: "São Paulo",
  delivery_state: "SP",
  delivery_zipcode: "01310-100",
  company_name: "Construtora ABC Ltda.",
  company_cnpj: "98.765.432/0001-00",
  company_street: "Av. Paulista",
  company_number: "1000",
  company_city: "São Paulo",
  company_state: "SP",
  items: [
    { name: "Tijolo cerâmico 8 furos", unit: "Milheiro", quantity: 1, unit_price: 1000, total_price: 1000 },
    { name: "Cimento asfáltico",       unit: "Quilos",   quantity: 50, unit_price: 100,  total_price: 5000 },
  ],
  subtotal: 6000,
  freight: 50,
  total: 6050,
  payment_method: 1,
  arrival_estimate: "2026-06-10",
  status: "Processada",
  created_at: new Date().toISOString(),
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrdemCompraDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [oc, setOc] = useState<OC | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (id === "mock") {
      setOc(MOCK_OC)
      setLoading(false)
      return
    }
    authFetch(`/api/ordens-compra/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setOc({ ...data, items: typeof data.items === "string" ? JSON.parse(data.items) : (data.items ?? []) })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!cancelReason.trim()) { toast.error("Informe o motivo do cancelamento."); return }
    setCancelling(true)
    try {
      const res = await authFetch(`/api/ordens-compra/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel_reason: cancelReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao cancelar")
      if (data._op_warning) toast.error(data._op_warning, { duration: 6000 })
      else toast.success("Ordem de compra cancelada com sucesso.")
      setShowCancelModal(false)
      setOc(prev => prev ? { ...prev, status: "Cancelada" } : prev)
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cancelar ordem de compra")
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )

  if (!oc) return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-3 text-[#9E9E9E]">
      <AlertCircle size={36} strokeWidth={1.2} />
      <p className="text-sm">Ordem de compra não encontrada.</p>
    </div>
  )

  const cfg = STATUS_CFG[oc.status] ?? { label: oc.status, color: "#757575", bg: "#F5F5F5" }
  const items: any[] = Array.isArray(oc.items) ? oc.items : []
  const canCancel = oc.status !== "Cancelada" && oc.status !== "Entregue"

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-10" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Modal de cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={e => { if (e.target === e.currentTarget) setShowCancelModal(false) }}>
          <div className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: 480 }}>
            <div className="px-5 pt-5 pb-4 border-b border-[#F5F5F5]">
              <h2 className="font-bold text-[#212121] text-base">Cancelar ordem de compra</h2>
              <p className="text-xs text-[#9E9E9E] mt-1">
                Esta ação irá cancelar a OC no ObraPlay e em nosso sistema. Informe o motivo.
              </p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <textarea
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm text-[#212121] resize-none focus:outline-none focus:border-[#1565C0]"
                rows={3}
                placeholder="Ex: Negociação cancelada pelo fornecedor..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#E0E0E0] text-sm text-[#616161] font-medium hover:bg-[#F5F5F5] transition-colors">
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 rounded-xl bg-[#F44336] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#D32F2F] transition-colors disabled:opacity-60">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9E9E9E]">Ordem de compra</p>
            <h1 className="font-bold text-[#212121] tracking-widest font-mono">{oc.identifier}</h1>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Itens */}
        <Section title="Itens" icon={Package}>
          <div className="flex flex-col gap-0">
            {/* Header */}
            <div className="flex gap-2 pb-2 border-b border-[#F5F5F5] mb-1">
              <span className="flex-1 text-[10px] font-bold text-[#9E9E9E] uppercase">Item</span>
              <span className="w-10 text-center text-[10px] font-bold text-[#9E9E9E] uppercase">Qtd.</span>
              <span className="w-12 text-center text-[10px] font-bold text-[#9E9E9E] uppercase">Un.</span>
              <span className="w-20 text-right text-[10px] font-bold text-[#9E9E9E] uppercase">V. Unit.</span>
              <span className="w-20 text-right text-[10px] font-bold text-[#9E9E9E] uppercase">Total</span>
            </div>
            {items.map((item: any, i: number) => (
              <div key={i} className="flex gap-2 py-2.5 border-b border-[#F5F5F5] last:border-0">
                <span className="flex-1 text-xs text-[#212121] font-medium">{item.name}</span>
                <span className="w-10 text-center text-xs text-[#616161]">{item.quantity}</span>
                <span className="w-12 text-center text-xs text-[#616161]">{item.unit}</span>
                <span className="w-20 text-right text-xs text-[#616161]">{fmtBRL(item.unit_price)}</span>
                <span className="w-20 text-right text-xs font-bold text-[#212121]">{fmtBRL(item.total_price ?? item.total_price)}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Valores */}
        <Section title="Valores" icon={DollarSign}>
          <div className="flex flex-col gap-0">
            <Row label="Subtotal" value={fmtBRL(oc.subtotal)} />
            <Row label="Frete" value={oc.freight === 0 ? "Grátis" : fmtBRL(oc.freight)} />
            {oc.payment_method && <Row label="Forma de pagamento" value={PAYMENT_LABELS[oc.payment_method] ?? "—"} />}
            {oc.arrival_estimate && <Row label="Prazo de entrega" value={fmtDate(oc.arrival_estimate)} />}
            <div className="flex justify-between gap-4 pt-2 mt-1 border-t-2 border-[#E0E0E0]">
              <span className="text-sm font-bold text-[#212121]">TOTAL</span>
              <span className="text-lg font-bold text-[#1565C0]">{fmtBRL(oc.total)}</span>
            </div>
          </div>
        </Section>

        {/* Fornecedor */}
        <Section title="Fornecedor" icon={Building2}>
          <Row label="Nome" value={oc.supplier_name} />
          <Row label="CNPJ" value={oc.supplier_cnpj} />
          <Row label="Telefone" value={oc.supplier_phone} />
          <Row label="E-mail" value={oc.supplier_email} />
        </Section>

        {/* Comprador */}
        <Section title="Dados do comprador" icon={User}>
          <Row label="Empresa" value={oc.company_name} />
          <Row label="CNPJ" value={oc.company_cnpj} />
          {(oc.company_street || oc.company_city) && (
            <Row label="Endereço"
              value={[oc.company_street, oc.company_number, oc.company_city, oc.company_state].filter(Boolean).join(", ")} />
          )}
        </Section>

        {/* Entrega */}
        {(oc.delivery_city || oc.delivery_street) && (
          <Section title="Endereço de entrega" icon={MapPin}>
            <Row label="Obra" value={oc.obra_name} />
            <Row label="Endereço"
              value={[oc.delivery_street, oc.delivery_number, oc.delivery_neighbourhood, oc.delivery_city, oc.delivery_state].filter(Boolean).join(", ")} />
            <Row label="CEP" value={oc.delivery_zipcode} />
          </Section>
        )}

        {/* Cotação relacionada */}
        {(oc.cotacao_identifier || oc.obraplay_quotation_code) && (
          <Section title="Cotação relacionada" icon={Package}>
            <Row label="Identificador" value={oc.obraplay_quotation_code ?? oc.cotacao_identifier} />
          </Section>
        )}

        {/* Anexos */}
        <Section title="Anexos" icon={Paperclip}>
          <p className="text-xs text-[#9E9E9E] text-center py-2">Nenhum anexo disponível.</p>
        </Section>

        {/* Botão lançamento financeiro */}
        {oc.status !== "Cancelada" && (
          <button
            onClick={() => {
              const params = new URLSearchParams({
                type: "despesa",
                oc_id: oc.id,
                description: `Pagamento OC ${oc.identifier} — ${oc.supplier_name}`,
                amount: String(oc.total ?? 0),
                ...(oc.obra_name ? { obra_hint: oc.obra_name } : {}),
              })
              router.push(`/dashboard/financeiro/lancamentos/nova?${params.toString()}`)
            }}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0D47A1] transition-colors shadow-sm">
            <TrendingUp size={16} />
            Gerar lançamento financeiro
          </button>
        )}

        {/* Botão cancelar */}
        {canCancel && (
          <button
            onClick={() => { setCancelReason(""); setShowCancelModal(true) }}
            className="w-full py-3.5 rounded-2xl border border-[#F44336] text-[#F44336] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#FFEBEE] transition-colors">
            <XCircle size={16} />
            Cancelar ordem de compra
          </button>
        )}
      </div>
    </div>
  )
}
