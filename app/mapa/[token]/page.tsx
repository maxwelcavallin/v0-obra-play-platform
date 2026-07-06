"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { Loader2, AlertCircle, MapPin, Calendar, Package, Info, ChevronRight } from "lucide-react"
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
  cash: "À vista", bankslip: "Boleto", credit_card: "Cartão",
  pix: "Pix", bank_transfer: "Transferência", other: "Outro",
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#EEEEEE] rounded ${className}`} />
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="h-14 bg-[#212121]" />
      <div className="h-20 bg-white border-b border-[#E8E8E8]" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
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

  const grid = useMemo(() => {
    if (!data) return {} as Record<string, Record<string, Resposta>>
    const m: Record<string, Record<string, Resposta>> = {}
    data.respostas.forEach(r => {
      if (!m[r.cotacao_fornecedor_id]) m[r.cotacao_fornecedor_id] = {}
      m[r.cotacao_fornecedor_id][r.cotacao_item_id] = r
    })
    return m
  }, [data])

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F7] gap-3 px-6 text-center">
      <AlertCircle size={36} className="text-[#BDBDBD]" />
      <h1 className="text-lg font-bold text-[#212121]">Link inválido ou expirado</h1>
      <p className="text-sm text-[#9E9E9E] max-w-xs">{error ?? "Este link não existe ou foi desativado."}</p>
      <p className="text-xs text-[#BDBDBD] mt-1">Entre em contato com a construtora para solicitar um novo link.</p>
    </div>
  )

  const { cotacao, items } = data
  const hasAnswers = answeredSuppliers.length > 0

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-[#212121] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {cotacao.company_logo ? (
              <Image
                src={cotacao.company_logo} alt={cotacao.company_name ?? "Empresa"}
                width={30} height={30}
                className="rounded-full object-cover bg-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Package size={14} className="text-white/70" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate leading-tight">
                {cotacao.company_name ?? "Obra Play"}
              </p>
              <p className="text-white/40 text-[10px] leading-tight">Mapa de Cotação</p>
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] text-white/50 border border-white/15 px-2.5 py-1 rounded-full">
            Somente leitura
          </span>
        </div>
      </header>

      {/* ── Info da cotação ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-bold text-[#212121] text-lg leading-tight">
                {cotacao.identifier}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {cotacao.obra_name && (
                  <span className="flex items-center gap-1 text-sm text-[#757575]">
                    <MapPin size={12} className="text-[#BDBDBD]" />
                    {cotacao.obra_name}
                  </span>
                )}
                {cotacao.need_date && (
                  <span className="flex items-center gap-1 text-sm text-[#757575]">
                    <Calendar size={12} className="text-[#BDBDBD]" />
                    Necessidade: {fmtDate(cotacao.need_date)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cards de resumo */}
          {hasAnswers && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl px-3 py-2.5 bg-[#F7F7F7]">
                <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">Fornecedores</p>
                <p className="text-xl font-bold text-[#212121] leading-tight">{answeredSuppliers.length}</p>
                <p className="text-[10px] text-[#BDBDBD]">responderam</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 bg-[#F7F7F7]">
                <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">Itens</p>
                <p className="text-xl font-bold text-[#212121] leading-tight">{items.length}</p>
                <p className="text-[10px] text-[#BDBDBD]">cotados</p>
              </div>
              {minTotal != null && (
                <div className="rounded-xl px-3 py-2.5 bg-[#F0FBF1] border border-[#C8E6C9]">
                  <p className="text-[10px] text-[#2E7D32] uppercase tracking-wide">Melhor oferta</p>
                  <p className="text-sm font-bold text-[#2E7D32] leading-tight truncate">
                    {fmtBRL(minTotal) ?? "—"}
                  </p>
                  <p className="text-[10px] text-[#81C784]">total + frete</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full py-4 pb-20">

        {!hasAnswers ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <Package size={32} className="text-[#BDBDBD]" />
            <p className="font-semibold text-[#424242]">Aguardando respostas</p>
            <p className="text-sm text-[#9E9E9E] max-w-xs">
              Os fornecedores ainda não enviaram propostas.
            </p>
          </div>
        ) : (
          <>
            {/* Legenda */}
            <div className="px-4 mb-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#E8F5E9] border border-[#A5D6A7]" />
                Menor preço do item
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#9E9E9E]">
                <span className="text-[#BDBDBD]">Não possui</span>
                <span className="text-[#DEDEDE]">= sem oferta</span>
              </div>
            </div>

            {/* Tabela com scroll horizontal */}
            <div className="px-4 relative">

              {answeredSuppliers.length > 1 && !tableAtEnd && (
                <div
                  className="pointer-events-none absolute top-0 right-4 bottom-0 w-16 z-10 rounded-r-2xl"
                  style={{ background: "linear-gradient(to right, transparent, rgba(247,247,247,0.97))" }}
                />
              )}

              <div
                ref={tableScrollRef}
                onScroll={onTableScroll}
                className="overflow-x-auto"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <table className="border-separate border-spacing-0" style={{ minWidth: 260 + answeredSuppliers.length * 150 }}>
                  <thead>
                    <tr>
                      {/* Coluna fixa de itens */}
                      <th
                        className="sticky left-0 z-10 bg-[#212121] px-3 py-3 text-left rounded-tl-2xl"
                        style={{ minWidth: 200, boxShadow: "2px 0 8px rgba(0,0,0,0.08)" }}
                      >
                        <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">Item</span>
                      </th>

                      {/* Colunas de fornecedores */}
                      {answeredSuppliers.map((s, idx) => {
                        const isLast = idx === answeredSuppliers.length - 1
                        const isBestTotal = supplierTotals[s.id] === minTotal
                        return (
                          <th
                            key={s.id}
                            className={`px-3 py-3 text-center bg-[#212121] ${isLast ? "rounded-tr-2xl" : ""}`}
                            style={{ minWidth: 150 }}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              {s.is_recommended && (
                                <span className="text-[9px] font-semibold text-[#9E9E9E] uppercase tracking-wide">
                                  Credenciado
                                </span>
                              )}
                              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                                {s.supplier_name}
                              </span>
                              {s.supplier_city && (
                                <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                                  <MapPin size={8} /> {s.supplier_city}
                                </span>
                              )}
                              {isBestTotal && (
                                <span className="text-[9px] font-bold text-[#2E7D32] bg-[#E8F5E9] rounded-full px-2 py-0.5 mt-1">
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
                              boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
                              borderBottomLeftRadius: isLastItem ? "1rem" : undefined,
                            }}
                          >
                            <p className="text-sm font-semibold text-[#212121] leading-tight">{item.name}</p>
                            <p className="text-xs text-[#BDBDBD] mt-0.5">{item.quantity} {item.unit}</p>
                          </td>

                          {/* Células de preço */}
                          {answeredSuppliers.map((s, sIdx) => {
                            const r = grid[s.id]?.[item.id]
                            const isBest = r?.unit_price_micros != null && r.unit_price_micros === minPrices[item.id]
                            const isLast = sIdx === answeredSuppliers.length - 1

                            return (
                              <td
                                key={s.id}
                                className="px-3 py-3 text-center border-b border-[#F0F0F0]"
                                style={{
                                  background: isBest ? "#E8F5E9" : "white",
                                  outline: isBest ? "2px solid #A5D6A7" : undefined,
                                  outlineOffset: "-2px",
                                  borderBottomRightRadius: isLastItem && isLast ? "1rem" : undefined,
                                }}
                              >
                                {!r || !r.available || r.unit_price_micros == null ? (
                                  <span className="text-xs text-[#DEDEDE]">Não possui</span>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-sm font-bold ${isBest ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                                      {fmtBRL(r.unit_price_micros)}
                                    </span>
                                    <span className="text-[10px] text-[#BDBDBD]">/{item.unit}</span>
                                    <span className={`text-[10px] ${isBest ? "font-semibold text-[#4CAF50]" : "text-[#DEDEDE]"}`}>
                                      total {fmtBRL(r.unit_price_micros * item.quantity)}
                                    </span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Linha de rodapé: total + condições */}
                    <tr>
                      <td
                        className="sticky left-0 z-10 bg-[#FAFAFA] px-3 py-3 rounded-bl-2xl border-t border-[#EEEEEE]"
                        style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.04)" }}
                      >
                        <p className="text-xs font-bold text-[#424242] uppercase tracking-wide">Total + frete</p>
                        <p className="text-[10px] text-[#BDBDBD] mt-0.5">Condições</p>
                      </td>

                      {answeredSuppliers.map((s, sIdx) => {
                        const isLast = sIdx === answeredSuppliers.length - 1
                        const firstResp = Object.values(grid[s.id] ?? {})[0]
                        const total = supplierTotals[s.id]
                        const isBestTotal = total === minTotal

                        return (
                          <td
                            key={s.id}
                            className="px-3 py-3 text-center border-t border-[#EEEEEE]"
                            style={{
                              background: isBestTotal ? "#E8F5E9" : "#FAFAFA",
                              borderBottomRightRadius: isLast ? "1rem" : undefined,
                            }}
                          >
                            <p className={`text-sm font-bold ${isBestTotal ? "text-[#2E7D32]" : "text-[#424242]"}`}>
                              {fmtBRL(total) ?? "—"}
                            </p>

                            <div className="flex flex-col items-center gap-1 mt-1.5">
                              {firstResp?.payment_method && (
                                <span className="text-[10px] text-[#757575] bg-[#F5F5F5] px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {PAYMENT_LABELS[firstResp.payment_method] ?? firstResp.payment_method}
                                  {firstResp.installments && firstResp.installments > 1 ? ` ${firstResp.installments}x` : ""}
                                </span>
                              )}
                              {firstResp?.arrival_estimate && (
                                <span className="text-[10px] text-[#757575] bg-[#F5F5F5] px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Entrega: {fmtDate(firstResp.arrival_estimate)}
                                </span>
                              )}
                              {firstResp?.free_shipping ? (
                                <span className="text-[10px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                                  Frete grátis
                                </span>
                              ) : firstResp?.total_freight_micros ? (
                                <span className="text-[10px] text-[#757575] bg-[#F5F5F5] px-2 py-0.5 rounded-full whitespace-nowrap">
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

              {answeredSuppliers.length > 1 && !tableAtEnd && (
                <div className="flex justify-center mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#BDBDBD] bg-white border border-[#EEEEEE] rounded-full px-4 py-1.5 select-none">
                    <ChevronRight size={12} />
                    Deslize para ver mais fornecedores
                  </span>
                </div>
              )}
            </div>

            {/* Notas gerais */}
            {cotacao.general_notes && (
              <div className="mx-4 mt-4 bg-[#F7F7F7] border border-[#EEEEEE] rounded-xl px-4 py-3 flex gap-2">
                <Info size={14} className="text-[#BDBDBD] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#757575] mb-0.5">Observações</p>
                  <p className="text-sm text-[#616161]">{cotacao.general_notes}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#EEEEEE] py-5 text-center">
        <p className="text-xs text-[#BDBDBD]">
          Gerado pelo{" "}
          <a href="https://go.obraplay.com" target="_blank" rel="noopener noreferrer"
             className="text-[#424242] font-semibold hover:underline">
            Obra Play
          </a>
        </p>
        <p className="text-[10px] text-[#DEDEDE] mt-1">
          Visualização exclusiva. Nenhuma ação pode ser executada por aqui.
        </p>
      </footer>
    </div>
  )
}
