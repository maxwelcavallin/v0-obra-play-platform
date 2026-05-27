"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Package, MapPin, Calendar, Clock, FileText,
  Building2, Phone, Mail, Check, Globe, Loader2, User,
  ChevronDown, ChevronUp, AlertCircle
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

interface CotacaoItem {
  id: string
  name: string
  unit: string
  quantity: number
}

interface CotacaoFornecedor {
  id: string
  supplier_name: string
  supplier_city?: string
  supplier_email?: string
  supplier_phone?: string
  is_recommended: boolean
  mirror_company_id?: number
  created_at: string
}

interface Cotacao {
  id: string
  identifier: string
  status: string
  need_date?: string
  expiry_date?: string
  response_date?: string
  general_notes?: string
  address_type: string
  is_public: boolean
  requester_name?: string
  requester_email?: string
  requester_phone?: string
  created_at: string
  obra_name?: string
  delivery_city?: string
  delivery_state?: string
  delivery_street?: string
  delivery_number?: string
  delivery_neighbourhood?: string
  delivery_zipcode?: string
  created_by_name?: string
  items: CotacaoItem[]
  suppliers: CotacaoFornecedor[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "Nova":             { label: "Nova",             color: "#1565C0", bg: "#E3F2FD" },
  "Respondida":       { label: "Respondida",       color: "#4CAF50", bg: "#E8F5E9" },
  "Pendente revisão": { label: "Pendente revisão", color: "#FF9800", bg: "#FFF3E0" },
  "Convertida":       { label: "Convertida",       color: "#9C27B0", bg: "#F3E5F5" },
  "Cancelada":        { label: "Cancelada",        color: "#F44336", bg: "#FFEBEE" },
}

function fmt(d?: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

const COLORS = ["#1565C0","#2E7D32","#E65100","#6A1B9A","#00838F","#AD1457","#4527A0"]
function getColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[#F5F5F5]">
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

export default function CotacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cotacao, setCotacao] = useState<Cotacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllSuppliers, setShowAllSuppliers] = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/cotacoes/${id}`)
      .then(r => r.json())
      .then(d => setCotacao(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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

  const cfg = STATUS_CFG[cotacao.status] ?? { label: cotacao.status, color: "#757575", bg: "#F5F5F5" }
  const suppliersToShow = showAllSuppliers ? cotacao.suppliers : cotacao.suppliers.slice(0, 3)

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col pb-10" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9E9E9E]">Cotação</p>
            <h1 className="font-bold text-[#212121] tracking-widest" style={{ fontFamily: "monospace", fontSize: "1.05rem" }}>
              {cotacao.identifier}
            </h1>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4">

        {/* Resumo */}
        <Section title="Resumo">
          <Row label="Criada em"       value={fmt(cotacao.created_at)} />
          <Row label="Necessidade"     value={fmt(cotacao.need_date)} />
          <Row label="Prazo resposta"  value={fmt(cotacao.expiry_date)} />
          <Row label="Vendedor"        value={cotacao.created_by_name} />
          <Row label="Solicitante"     value={cotacao.requester_name} />
          <Row label="E-mail"          value={cotacao.requester_email} />
          <Row label="Telefone"        value={cotacao.requester_phone} />
          {cotacao.is_public && (
            <div className="flex items-center gap-2 mt-2 bg-[#E3F2FD] rounded-xl px-3 py-2">
              <Globe size={13} className="text-[#1565C0]" />
              <p className="text-xs text-[#1565C0] font-semibold">Cotação pública — visível a todos os fornecedores</p>
            </div>
          )}
        </Section>

        {/* Obra e endereço */}
        {(cotacao.obra_name || cotacao.delivery_city) && (
          <Section title="Obra e Endereço de Entrega">
            <Row label="Obra" value={cotacao.obra_name} />
            <Row label="Endereço" value={[cotacao.delivery_street, cotacao.delivery_number].filter(Boolean).join(", ")} />
            <Row label="Bairro"   value={cotacao.delivery_neighbourhood} />
            <Row label="Cidade"   value={[cotacao.delivery_city, cotacao.delivery_state].filter(Boolean).join(" - ")} />
            <Row label="CEP"      value={cotacao.delivery_zipcode} />
          </Section>
        )}

        {/* Itens */}
        <Section title={`Itens solicitados (${cotacao.items.length})`}>
          {cotacao.items.length === 0 && (
            <p className="text-xs text-[#9E9E9E] py-2">Nenhum item registrado.</p>
          )}
          <div className="flex flex-col gap-2">
            {cotacao.items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                  <Package size={13} className="text-[#1565C0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#212121] truncate">{item.name}</p>
                  <p className="text-xs text-[#9E9E9E]">{item.quantity} {item.unit}</p>
                </div>
                <span className="text-xs text-[#BDBDBD] flex-shrink-0">#{i + 1}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Observações */}
        {cotacao.general_notes && (
          <Section title="Observações">
            <p className="text-sm text-[#424242] leading-relaxed whitespace-pre-wrap">{cotacao.general_notes}</p>
          </Section>
        )}

        {/* Fornecedores */}
        <Section title={`Fornecedores convidados (${cotacao.suppliers.length})`}>
          {cotacao.suppliers.length === 0 && !cotacao.is_public && (
            <p className="text-xs text-[#9E9E9E] py-2">Nenhum fornecedor convidado.</p>
          )}

          {cotacao.is_public && cotacao.suppliers.length === 0 && (
            <div className="flex items-center gap-2 py-2 text-[#1565C0]">
              <Globe size={14} />
              <p className="text-xs font-medium">Aberta para todos os fornecedores da plataforma.</p>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-1">
            {suppliersToShow.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getColor(s.supplier_name) }}>
                  {getInitials(s.supplier_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-[#212121] truncate">{s.supplier_name}</p>
                    {s.is_recommended && (
                      <span className="text-[10px] bg-[#1565C0] text-white px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                        Certificado
                      </span>
                    )}
                    {s.mirror_company_id && !s.is_recommended && (
                      <span className="text-[10px] bg-[#E3F2FD] text-[#1565C0] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                        ObraPlay
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {s.supplier_city && (
                      <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                        <MapPin size={10} />{s.supplier_city}
                      </span>
                    )}
                    {s.supplier_email && (
                      <span className="flex items-center gap-1 text-xs text-[#9E9E9E] truncate">
                        <Mail size={10} />{s.supplier_email}
                      </span>
                    )}
                    {s.supplier_phone && (
                      <span className="flex items-center gap-1 text-xs text-[#9E9E9E]">
                        <Phone size={10} />{s.supplier_phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {cotacao.suppliers.length > 3 && (
            <button
              onClick={() => setShowAllSuppliers(p => !p)}
              className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 rounded-xl border border-[#E0E0E0] text-xs font-semibold text-[#757575] hover:bg-[#F5F5F5] transition-colors">
              {showAllSuppliers
                ? <><ChevronUp size={14} />Mostrar menos</>
                : <><ChevronDown size={14} />Ver todos os {cotacao.suppliers.length} fornecedores</>
              }
            </button>
          )}
        </Section>

      </div>
    </div>
  )
}
