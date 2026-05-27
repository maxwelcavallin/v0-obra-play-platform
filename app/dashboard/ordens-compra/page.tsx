"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Loader2, AlertCircle, ChevronRight } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth-context"

interface OrdemCompra {
  id: string
  identifier: string
  supplier_name: string
  cotacao_identifier?: string
  obraplay_quotation_code?: string
  obra_name?: string
  total: number
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

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function OrdensCompraPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [ordens, setOrdens] = useState<OrdemCompra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany?.id) return
    authFetch(`/api/ordens-compra?company_id=${activeCompany.id}`)
      .then(r => r.json())
      .then(data => setOrdens(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeCompany?.id])

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-10" style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="h-1 w-full bg-[#1565C0]" />
        <div className="flex items-center gap-3 px-4 pt-4 pb-4">
          <ShoppingCart size={20} className="text-[#1565C0]" />
          <div>
            <h1 className="font-bold text-[#212121]">Ordens de Compra</h1>
            <p className="text-xs text-[#9E9E9E]">{activeCompany?.fantasy_name}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#1565C0]" />
        </div>
      )}

      {!loading && ordens.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#9E9E9E]">
          <ShoppingCart size={44} strokeWidth={1.2} />
          <p className="text-sm font-medium">Nenhuma ordem de compra gerada ainda.</p>
          <p className="text-xs text-center px-8">Gere ordens de compra a partir do mapa de cotação respondida.</p>
        </div>
      )}

      {!loading && ordens.length > 0 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Mock OC destacada */}
          <MockOCCard onClick={() => router.push("/dashboard/ordens-compra/mock")} />

          {ordens.map(oc => {
            const cfg = STATUS_CFG[oc.status] ?? { label: oc.status, color: "#757575", bg: "#F5F5F5" }
            return (
              <button key={oc.id} onClick={() => router.push(`/dashboard/ordens-compra/${oc.id}`)}
                className="bg-white rounded-2xl shadow-sm p-4 text-left w-full flex items-start gap-3 hover:shadow-md transition-shadow">
                <div className="w-9 h-9 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={16} className="text-[#1565C0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-bold text-[#212121] text-sm font-mono">{oc.identifier}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-[#616161] truncate">{oc.supplier_name}</p>
                  {oc.obra_name && <p className="text-[11px] text-[#9E9E9E] truncate">{oc.obra_name}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-[#9E9E9E]">{fmtDate(oc.created_at)}</span>
                    <span className="font-bold text-[#1565C0] text-sm">{fmtBRL(oc.total)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#BDBDBD] self-center flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Se ainda carregando mas já tem mock */}
      {!loading && ordens.length === 0 && (
        <div className="px-4 pt-4">
          <MockOCCard onClick={() => router.push("/dashboard/ordens-compra/mock")} />
        </div>
      )}
    </div>
  )
}

function MockOCCard({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-2xl shadow-sm p-4 text-left w-full flex items-start gap-3 hover:shadow-md transition-shadow border-2 border-dashed border-[#E3F2FD]">
      <div className="w-9 h-9 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
        <ShoppingCart size={16} className="text-[#1565C0]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-bold text-[#212121] text-sm font-mono">OC-ZMSDNDL</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#E8F5E9] text-[#4CAF50]">Processada</span>
        </div>
        <p className="text-xs text-[#616161]">Fornecedor Exemplo Ltda.</p>
        <p className="text-[11px] text-[#9E9E9E]">Nova obra Joao Pizzini</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-[#9E9E9E]">27/05/2026</span>
          <span className="font-bold text-[#1565C0] text-sm">R$ 6.050,00</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-[#BDBDBD] self-center flex-shrink-0" />
    </button>
  )
}
