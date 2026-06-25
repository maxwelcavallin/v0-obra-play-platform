"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertCircle, MapPin, Calendar, Package } from "lucide-react"
import Image from "next/image"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapaItem { id: string; name: string; unit: string; quantity: number }
interface Supplier  { id: string; supplier_name: string; supplier_city?: string }
interface Resposta  {
  cotacao_fornecedor_id: string
  cotacao_item_id: string
  item_name: string
  item_unit: string
  item_quantity: number
  answered: boolean
  available: boolean
  unit_price_micros: number | null
  total_quantity_micros: number | null
  total_discount_micros: number | null
  payment_method: string | null
  arrival_estimate: string | null
  observations: string | null
  freight: number | null
  free_shipping: boolean
}
interface Cotacao {
  id: string; identifier: string; status: string; need_date: string | null
  obra_name?: string; company_name?: string; company_logo?: string
}
interface MapaData {
  cotacao: Cotacao
  items: MapaItem[]
  suppliers: Supplier[]
  respostas: Resposta[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(micros: number | null | undefined) {
  if (micros == null) return "—"
  return (micros / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function fmtDate(d?: string | null) {
  if (!d) return null
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR")
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: "À vista", bankslip: "Boleto", credit_card: "Cartão crédito",
  pix: "Pix", bank_transfer: "Transferência", other: "Outro",
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicMapaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<MapaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/mapa/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError("Erro ao carregar o mapa"))
      .finally(() => setLoading(false))
  }, [token])

  // Agrupa respostas: fornecedor → item → resposta
  const grid = useMemo(() => {
    if (!data) return {}
    const map: Record<string, Record<string, Resposta>> = {}
    data.respostas.forEach(r => {
      if (!map[r.cotacao_fornecedor_id]) map[r.cotacao_fornecedor_id] = {}
      map[r.cotacao_fornecedor_id][r.cotacao_item_id] = r
    })
    return map
  }, [data])

  // Menor preço por item (micros)
  const minPrices = useMemo(() => {
    if (!data) return {} as Record<string, number>
    const m: Record<string, number> = {}
    data.items.forEach(item => {
      const prices = data.respostas
        .filter(r => r.cotacao_item_id === item.id && r.available && r.unit_price_micros != null)
        .map(r => r.unit_price_micros as number)
      if (prices.length) m[item.id] = Math.min(...prices)
    })
    return m
  }, [data])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={32} className="animate-spin text-[#1565C0]" />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5] gap-4 px-6 text-center">
      <AlertCircle size={48} className="text-[#D32F2F]" />
      <h1 className="text-xl font-bold text-[#212121]">Link inválido</h1>
      <p className="text-[#757575]">{error ?? "Este link não existe ou expirou."}</p>
    </div>
  )

  const { cotacao, items, suppliers } = data

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Header */}
      <header className="bg-[#1565C0] shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {cotacao.company_logo ? (
              <Image src={cotacao.company_logo} alt={cotacao.company_name ?? ""} width={32} height={32} className="rounded-full object-cover bg-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Package size={16} className="text-white" />
              </div>
            )}
            <span className="text-white font-bold text-base truncate max-w-[200px]">
              {cotacao.company_name ?? "Obra Play"}
            </span>
          </div>
          <span className="text-white/70 text-xs font-medium bg-white/10 px-2 py-1 rounded-full">
            Somente leitura
          </span>
        </div>
      </header>

      {/* Info da cotação */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="font-bold text-[#212121] text-lg">{cotacao.identifier}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {cotacao.obra_name && (
              <span className="flex items-center gap-1 text-sm text-[#757575]">
                <MapPin size={13} /> {cotacao.obra_name}
              </span>
            )}
            {cotacao.need_date && (
              <span className="flex items-center gap-1 text-sm text-[#757575]">
                <Calendar size={13} /> Necessidade: {fmtDate(cotacao.need_date)}
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              cotacao.status === "Respondida" ? "bg-[#E8F5E9] text-[#388E3C]" : "bg-[#E3F2FD] text-[#1565C0]"
            }`}>
              {cotacao.status}
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-2 py-4 pb-16">
        {suppliers.filter(s => grid[s.id]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Package size={40} className="text-[#BDBDBD]" />
            <p className="font-semibold text-[#424242]">Nenhuma resposta ainda</p>
            <p className="text-sm text-[#9E9E9E]">Os fornecedores ainda não responderam esta cotação.</p>
          </div>
        ) : (
          suppliers.filter(s => grid[s.id]).map(supplier => {
            const resp = grid[supplier.id]
            const firstResp = Object.values(resp)[0]
            const subtotal = Object.values(resp).reduce((acc, r) =>
              acc + (r.available && r.unit_price_micros ? r.unit_price_micros : 0), 0)

            return (
              <div key={supplier.id} className="bg-white rounded-2xl shadow-sm border border-[#EEEEEE] mb-4 overflow-hidden">
                {/* Cabeçalho do fornecedor */}
                <div className="px-4 py-3 bg-[#F8FAFF] border-b border-[#EEEEEE]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-[#212121]">{supplier.supplier_name}</p>
                      {supplier.supplier_city && (
                        <p className="text-xs text-[#9E9E9E] flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {supplier.supplier_city}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9E9E9E]">Subtotal</p>
                      <p className="font-bold text-[#1565C0]">{fmtBRL(subtotal)}</p>
                    </div>
                  </div>

                  {/* Condições gerais */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {firstResp?.payment_method && (
                      <span className="text-[10px] bg-[#E3F2FD] text-[#1565C0] px-2 py-0.5 rounded-full font-medium">
                        {PAYMENT_LABELS[firstResp.payment_method] ?? firstResp.payment_method}
                      </span>
                    )}
                    {firstResp?.arrival_estimate && (
                      <span className="text-[10px] bg-[#F3E5F5] text-[#7B1FA2] px-2 py-0.5 rounded-full font-medium">
                        Entrega: {fmtDate(firstResp.arrival_estimate)}
                      </span>
                    )}
                    {firstResp?.free_shipping ? (
                      <span className="text-[10px] bg-[#E8F5E9] text-[#388E3C] px-2 py-0.5 rounded-full font-medium">Frete grátis</span>
                    ) : firstResp?.freight ? (
                      <span className="text-[10px] bg-[#FFF3E0] text-[#E65100] px-2 py-0.5 rounded-full font-medium">
                        Frete: {fmtBRL(firstResp.freight * 1_000_000)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Itens */}
                <div className="divide-y divide-[#F5F5F5]">
                  {items.map(item => {
                    const r = resp[item.id]
                    if (!r) return null
                    const isBest = r.unit_price_micros != null && r.unit_price_micros === minPrices[item.id]

                    return (
                      <div key={item.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${isBest ? "bg-[#F0FFF4]" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#212121] truncate">{item.name}</p>
                          <p className="text-xs text-[#9E9E9E]">{item.quantity} {item.unit}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {!r.answered || !r.available ? (
                            <span className="text-xs text-[#9E9E9E] italic">Não disponível</span>
                          ) : (
                            <>
                              <p className={`text-sm font-bold ${isBest ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                                {fmtBRL(r.unit_price_micros)} / {item.unit}
                              </p>
                              <p className="text-xs text-[#9E9E9E]">
                                Total: {fmtBRL(r.unit_price_micros != null ? r.unit_price_micros * item.quantity : null)}
                              </p>
                              {isBest && (
                                <span className="text-[10px] bg-[#C8E6C9] text-[#2E7D32] px-1.5 py-0.5 rounded font-bold">Menor preço</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#EEEEEE] py-4 text-center">
        <p className="text-xs text-[#9E9E9E]">
          Gerado pelo{" "}
          <a href="https://go.obraplay.com" target="_blank" rel="noopener noreferrer" className="text-[#1565C0] font-semibold hover:underline">
            Obra Play
          </a>
          {" "}— go.obraplay.com
        </p>
      </footer>
    </div>
  )
}
