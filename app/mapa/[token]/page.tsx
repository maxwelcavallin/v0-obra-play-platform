"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertCircle, MapPin, Calendar, Package, Info, TrendingDown, ChevronRight } from "lucide-react"
import Image from "next/image"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapaItem { id: string; name: string; unit: string; quantity: number }
interface Supplier  {
  id: string
  supplier_name: string
  supplier_city?: string
  is_recommended: boolean
}
interface Resposta {
  cotacao_fornecedor_id: string
  cotacao_item_id: string
  answered: boolean
  available: boolean
  unit_price_micros: number | null
  total_quantity_micros: number | null
  total_discount_micros: number | null
  payment_method: string | null
  installments: number | null
  arrival_estimate: string | null
  observations: string | null
  freight: number | null
  total_freight_micros: number | null
  free_shipping: boolean
}
interface Cotacao {
  identifier: string
  status: string
  need_date: string | null
  general_notes: string | null
  obra_name?: string
  company_name?: string
  company_logo?: string
}
interface MapaData {
  cotacao: Cotacao
  items: MapaItem[]
  suppliers: Supplier[]
  respostas: Resposta[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(micros: number | null | undefined) {
  if (micros == null) return null
  return (micros / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function fmtDate(d?: string | Date | null) {
  if (!d) return null
  const parsed = d instanceof Date ? d : new Date(String(d))
  if (isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "À vista", bankslip: "Boleto", credit_card: "Cartão de crédito",
  pix: "Pix", bank_transfer: "Transferência", other: "Outro",
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  "Respondida":  { bg: "#E8F5E9", text: "#2E7D32", label: "Respondida" },
  "Enviada":     { bg: "#E3F2FD", text: "#1565C0", label: "Aguardando respostas" },
  "Rascunho":    { bg: "#F5F5F5", text: "#757575", label: "Rascunho" },
  "Cancelada":   { bg: "#FFEBEE", text: "#C62828", label: "Cancelada" },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E0E0E0] rounded ${className}`} />
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="h-14 bg-[#1565C0]" />
      <div className="h-20 bg-white border-b border-[#EEEEEE]" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicMapaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData]       = useState<MapaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // scroll hint state
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [tableAtEnd, setTableAtEnd] = useState(false)
  function onTableScroll() {
    const el = tableScrollRef.current
    if (!el) return
    setTableAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  useEffect(() => {
    fetch(`/api/public/mapa/${token}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d.error) { setError(d.error ?? "Erro ao carregar"); return }
        setData(d)
      })
      .catch(() => setError("Não foi possível carregar o mapa."))
      .finally(() => setLoading(false))
  }, [token])

  // Grid: supplier_id → item_id → Resposta
  const grid = useMemo(() => {
    if (!data) return {} as Record<string, Record<string, Resposta>>
    const m: Record<string, Record<string, Resposta>> = {}
    data.respostas.forEach(r => {
      if (!m[r.cotacao_fornecedor_id]) m[r.cotacao_fornecedor_id] = {}
      m[r.cotacao_fornecedor_id][r.cotacao_item_id] = r
    })
    return m
  }, [data])

  // Menor preço por item em micros
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

  // Fornecedores que responderam, ordenados: melhor preço credenciado → melhor preço → credenciados → gerais
  const answeredSuppliers = useMemo(() => {
    if (!data) return [] as Supplier[]
    const hasAllItems = (s: Supplier) => data.items.every(item => {
      const r = grid[s.id]?.[item.id]
      return r && r.available && r.unit_price_micros != null
    })
    const totalFor = (s: Supplier) =>
      data.items.reduce((acc, item) => acc + (grid[s.id]?.[item.id]?.unit_price_micros ?? 0), 0)

    const rank = (s: Supplier) => {
      const eli = hasAllItems(s)
      if (s.is_recommended && eli) return 0
      if (eli)                     return 1
      if (s.is_recommended)        return 2
      return 3
    }

    return data.suppliers
      .filter(s => grid[s.id])
      .sort((a, b) => {
        const rd = rank(a) - rank(b)
        if (rd !== 0) return rd
        return totalFor(a) - totalFor(b)
      })
  }, [data, grid])

  // Subtotal + frete por fornecedor (para resumo)
  const supplierTotals = useMemo(() => {
    const m: Record<string, number> = {}
    answeredSuppliers.forEach(s => {
      const itemTotal = data?.items.reduce((acc, item) => {
        const r = grid[s.id]?.[item.id]
        return acc + (r?.available && r.unit_price_micros ? r.unit_price_micros * item.quantity : 0)
      }, 0) ?? 0
      const firstResp = Object.values(grid[s.id] ?? {})[0]
      const frete = firstResp?.free_shipping ? 0 : (firstResp?.total_freight_micros ?? 0)
      m[s.id] = itemTotal + frete
    })
    return m
  }, [answeredSuppliers, data, grid])

  const minTotal = answeredSuppliers.length
    ? Math.min(...answeredSuppliers.map(s => supplierTotals[s.id] ?? Infinity))
    : null

  if (loading) return <PageSkeleton />

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5] gap-4 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFEBEE] flex items-center justify-center">
        <AlertCircle size={32} className="text-[#D32F2F]" />
      </div>
      <h1 className="text-xl font-bold text-[#212121]">Link inválido ou expirado</h1>
      <p className="text-sm text-[#757575] max-w-xs">{error ?? "Este link não existe ou foi desativado."}</p>
      <p className="text-xs text-[#9E9E9E] mt-2">Entre em contato com a construtora para solicitar um novo link.</p>
    </div>
  )

  const { cotacao, items } = data
  const statusStyle = STATUS_STYLE[cotacao.status] ?? STATUS_STYLE["Enviada"]
  const hasAnswers = answeredSuppliers.length > 0

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-[#1565C0] sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo + nome da empresa */}
          <div className="flex items-center gap-2.5 min-w-0">
            {cotacao.company_logo ? (
              <Image
                src={cotacao.company_logo} alt={cotacao.company_name ?? "Empresa"}
                width={32} height={32}
                className="rounded-full object-cover bg-white flex-shrink-0 ring-2 ring-white/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Package size={15} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">
                {cotacao.company_name ?? "Obra Play"}
              </p>
              <p className="text-white/60 text-[10px] leading-tight">Mapa de Cotação</p>
            </div>
          </div>

          <span className="flex-shrink-0 text-[10px] font-semibold text-white/80 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
            Somente leitura
          </span>
        </div>
      </header>

      {/* ── Info da cotação ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-bold text-[#212121] text-lg leading-tight truncate">
                {cotacao.identifier}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {cotacao.obra_name && (
                  <span className="flex items-center gap-1 text-sm text-[#616161]">
                    <MapPin size={12} className="text-[#9E9E9E]" />
                    {cotacao.obra_name}
                  </span>
                )}
                {cotacao.need_date && (
                  <span className="flex items-center gap-1 text-sm text-[#616161]">
                    <Calendar size={12} className="text-[#9E9E9E]" />
                    Necessidade: {fmtDate(cotacao.need_date)}
                  </span>
                )}
              </div>
            </div>
            <span
              className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Cards de resumo */}
          {hasAnswers && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-[#F8FAFF] rounded-xl px-3 py-2.5 border border-[#E3F2FD]">
                <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">Fornecedores</p>
                <p className="text-xl font-bold text-[#1565C0] leading-tight">{answeredSuppliers.length}</p>
                <p className="text-[10px] text-[#9E9E9E]">responderam</p>
              </div>
              <div className="bg-[#F8FAFF] rounded-xl px-3 py-2.5 border border-[#E3F2FD]">
                <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">Itens</p>
                <p className="text-xl font-bold text-[#1565C0] leading-tight">{items.length}</p>
                <p className="text-[10px] text-[#9E9E9E]">cotados</p>
              </div>
              {minTotal != null && (
                <div className="bg-[#F0FFF4] rounded-xl px-3 py-2.5 border border-[#C8E6C9]">
                  <p className="text-[10px] text-[#4CAF50] uppercase tracking-wide">Melhor oferta</p>
                  <p className="text-sm font-bold text-[#2E7D32] leading-tight truncate">
                    {fmtBRL(minTotal) ?? "—"}
                  </p>
                  <p className="text-[10px] text-[#66BB6A]">total + frete</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full py-4 pb-20">

        {!hasAnswers ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-[#E3F2FD] flex items-center justify-center">
              <Package size={28} className="text-[#1565C0]" />
            </div>
            <p className="font-bold text-[#424242] text-lg">Aguardando respostas</p>
            <p className="text-sm text-[#9E9E9E] max-w-xs">
              Os fornecedores ainda não enviaram propostas. Você receberá uma notificação quando estiverem disponíveis.
            </p>
          </div>
        ) : (
          <>
            {/* Legenda */}
            <div className="px-4 mb-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-[#757575]">
                <div className="w-3 h-3 rounded-sm bg-[#E8F5E9] border border-[#A5D6A7]" />
                Menor preço do item
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#757575]">
                <div className="w-3 h-3 rounded-sm bg-[#FFF8E1] border border-[#FFD54F]" />
                Fornecedor credenciado
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#757575]">
                <span className="text-[#9E9E9E]">Não possui</span> = sem oferta
              </div>
            </div>

            {/* Tabela cruzada com scroll horizontal */}
            <div className="px-4 relative">

              {/* Fade direita */}
              {answeredSuppliers.length > 1 && !tableAtEnd && (
                <div
                  className="pointer-events-none absolute top-0 right-4 bottom-0 w-16 z-10 rounded-r-2xl"
                  style={{ background: "linear-gradient(to right, transparent, rgba(245,245,245,0.97))" }}
                />
              )}

              <div
                ref={tableScrollRef}
                onScroll={onTableScroll}
                className="overflow-x-auto"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <table className="border-separate border-spacing-0" style={{ minWidth: 280 + answeredSuppliers.length * 150 }}>
                  <thead>
                    <tr>
                      {/* Coluna fixa de itens */}
                      <th className="sticky left-0 z-10 bg-[#1565C0] px-3 py-3 text-left rounded-tl-2xl"
                          style={{ minWidth: 200, boxShadow: "2px 0 8px rgba(0,0,0,0.08)" }}>
                        <span className="text-white text-xs font-semibold uppercase tracking-wide">Item</span>
                      </th>

                      {/* Colunas de fornecedores */}
                      {answeredSuppliers.map((s, idx) => {
                        const isLast = idx === answeredSuppliers.length - 1
                        const isBestTotal = supplierTotals[s.id] === minTotal
                        return (
                          <th key={s.id}
                              className={`px-3 py-3 text-center ${isLast ? "rounded-tr-2xl" : ""}`}
                              style={{
                                minWidth: 150,
                                background: s.is_recommended ? "#FFF8E1" : "#1565C0",
                              }}>
                            <div className="flex flex-col items-center gap-0.5">
                              {s.is_recommended && (
                                <span className="text-[9px] font-bold text-[#F57F17] bg-[#FFF3E0] rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                                  Credenciado
                                </span>
                              )}
                              <span className={`text-xs font-bold truncate max-w-[130px] ${s.is_recommended ? "text-[#212121]" : "text-white"}`}>
                                {s.supplier_name}
                              </span>
                              {s.supplier_city && (
                                <span className={`text-[10px] flex items-center gap-0.5 ${s.is_recommended ? "text-[#9E9E9E]" : "text-white/60"}`}>
                                  <MapPin size={8} /> {s.supplier_city}
                                </span>
                              )}
                              {isBestTotal && (
                                <span className="text-[9px] font-bold text-[#2E7D32] bg-[#C8E6C9] rounded-full px-1.5 py-0.5 mt-0.5">
                                  Melhor total
                                </span>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, itemIdx) => {
                      const isLastItem = itemIdx === items.length - 1
                      return (
                        <tr key={item.id}>
                          {/* Coluna fixa do item */}
                          <td
                            className="sticky left-0 z-10 bg-white px-3 py-3 border-b border-[#F0F0F0]"
                            style={{
                              boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
                              borderBottomLeftRadius: isLastItem ? "1rem" : undefined,
                            }}
                          >
                            <p className="text-sm font-semibold text-[#212121] leading-tight">{item.name}</p>
                            <p className="text-xs text-[#9E9E9E] mt-0.5">{item.quantity} {item.unit}</p>
                          </td>

                          {/* Células de preço por fornecedor */}
                          {answeredSuppliers.map((s, sIdx) => {
                            const r = grid[s.id]?.[item.id]
                            const isBest = r?.unit_price_micros != null && r.unit_price_micros === minPrices[item.id]
                            const isLast = sIdx === answeredSuppliers.length - 1

                            return (
                              <td key={s.id}
                                  className="px-3 py-3 text-center border-b border-[#F0F0F0] transition-colors"
                                  style={{
                                    background: isBest ? "#E8F5E9" : s.is_recommended ? "#FFFDF5" : "white",
                                    outline: isBest ? "2px solid #A5D6A7" : undefined,
                                    outlineOffset: "-2px",
                                    borderBottomRightRadius: isLastItem && isLast ? "1rem" : undefined,
                                  }}
                              >
                                {!r || !r.available || r.unit_price_micros == null ? (
                                  <span className="text-xs text-[#BDBDBD]">Não possui</span>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-sm font-bold ${isBest ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                                      {fmtBRL(r.unit_price_micros)}
                                    </span>
                                    <span className={`text-[10px] ${isBest ? "text-[#66BB6A]" : "text-[#9E9E9E]"}`}>
                                      /{item.unit}
                                    </span>
                                    <span className={`text-[10px] ${isBest ? "font-semibold text-[#2E7D32]" : "text-[#BDBDBD]"}`}>
                                      total {fmtBRL(r.unit_price_micros * item.quantity)}
                                    </span>
                                    {isBest && (
                                      <span className="text-[9px] font-bold bg-[#C8E6C9] text-[#2E7D32] px-1.5 py-0.5 rounded-full mt-0.5 flex items-center gap-0.5">
                                        <TrendingDown size={8} /> Menor preço
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Linha de rodapé: condições gerais + total */}
                    <tr>
                      <td
                        className="sticky left-0 z-10 bg-[#FAFAFA] px-3 py-3 rounded-bl-2xl border-t-2 border-[#E0E0E0]"
                        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.06)" }}
                      >
                        <p className="text-xs font-bold text-[#424242] uppercase tracking-wide">Total + frete</p>
                        <p className="text-[10px] text-[#9E9E9E] mt-0.5">Condições</p>
                      </td>

                      {answeredSuppliers.map((s, sIdx) => {
                        const isLast = sIdx === answeredSuppliers.length - 1
                        const firstResp = Object.values(grid[s.id] ?? {})[0]
                        const total = supplierTotals[s.id]
                        const isBestTotal = total === minTotal

                        return (
                          <td key={s.id}
                              className="px-3 py-3 text-center border-t-2 border-[#E0E0E0]"
                              style={{
                                background: isBestTotal ? "#F0FFF4" : s.is_recommended ? "#FFFDF5" : "#FAFAFA",
                                borderBottomRightRadius: isLast ? "1rem" : undefined,
                              }}
                          >
                            <p className={`text-sm font-bold ${isBestTotal ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                              {fmtBRL(total) ?? "—"}
                            </p>

                            {/* Condições em badges */}
                            <div className="flex flex-col items-center gap-1 mt-1.5">
                              {firstResp?.payment_method && (
                                <span className="text-[10px] bg-[#E3F2FD] text-[#1565C0] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                  {PAYMENT_LABELS[firstResp.payment_method] ?? firstResp.payment_method}
                                  {firstResp.installments && firstResp.installments > 1 ? ` ${firstResp.installments}x` : ""}
                                </span>
                              )}
                              {firstResp?.arrival_estimate && (
                                <span className="text-[10px] bg-[#F3E5F5] text-[#7B1FA2] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                  Entrega: {fmtDate(firstResp.arrival_estimate)}
                                </span>
                              )}
                              {firstResp?.free_shipping ? (
                                <span className="text-[10px] bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full font-medium">Frete grátis</span>
                              ) : firstResp?.total_freight_micros ? (
                                <span className="text-[10px] bg-[#FFF3E0] text-[#E65100] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                  Frete: {fmtBRL(firstResp.total_freight_micros)}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pill de dica de scroll */}
              {answeredSuppliers.length > 1 && !tableAtEnd && (
                <div className="flex justify-center mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9E9E9E] bg-white border border-[#E0E0E0] rounded-full px-4 py-1.5 shadow-sm select-none">
                    <ChevronRight size={12} />
                    Deslize para ver mais fornecedores
                  </span>
                </div>
              )}
            </div>

            {/* Notas gerais */}
            {cotacao.general_notes && (
              <div className="mx-4 mt-4 bg-[#FFF8E1] border border-[#FFE082] rounded-xl px-4 py-3 flex gap-2">
                <Info size={15} className="text-[#F9A825] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#F57F17] mb-0.5">Observações da cotação</p>
                  <p className="text-sm text-[#616161]">{cotacao.general_notes}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#EEEEEE] py-5 text-center">
        <p className="text-xs text-[#9E9E9E]">
          Gerado pelo{" "}
          <a href="https://go.obraplay.com" target="_blank" rel="noopener noreferrer"
             className="text-[#1565C0] font-semibold hover:underline">
            Obra Play
          </a>
          {" "}— go.obraplay.com
        </p>
        <p className="text-[10px] text-[#BDBDBD] mt-1">
          Este link é de leitura exclusiva. Nenhuma ação pode ser executada por aqui.
        </p>
      </footer>
    </div>
  )
}
