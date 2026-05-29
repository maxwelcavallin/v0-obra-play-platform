"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Share2, Loader2, AlertCircle, ShoppingCart,
  Check, TrendingDown, Package, Truck, X
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapaItem {
  cotacao_item_id: string
  name: string
  unit: string
  quantity: number
}

interface AnsweredItem {
  cotacao_item_id: string
  name: string
  unit: string
  quantity: number
  answered: boolean
  available: boolean
  unit_price: number | null
  total_price: number | null
}

interface SupplierMap {
  supplier_id: string
  supplier_name: string
  supplier_city?: string
  supplier_email?: string
  supplier_phone?: string
  is_recommended: boolean
  mirror_company_id?: number
  obraplay_answer_id?: number | null
  answered: boolean
  payment_method?: string | null
  installments?: string | null
  installments_obs?: string | null
  arrival_estimate?: string | null
  valid_until?: string | null
  observations?: string | null
  answered_items: AnsweredItem[]
  subtotal: number
  freight: number | null
  free_shipping: boolean
  total: number
}

interface MapaData {
  cotacao_id: string
  identifier: string
  obraplay_quotation_code?: string
  obra_name?: string
  status: string
  items: MapaItem[]
  suppliers: SupplierMap[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—"
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(d?: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("pt-BR")
}

const PAYMENT_LABELS: Record<string, string> = {
  // strings retornadas pelo ObraPlay
  "cash":           "À vista",
  "bankslip":       "Boleto",
  "credit_card":    "Cartão de crédito",
  "debit_card":     "Cartão de débito",
  "pix":            "Pix",
  "check":          "Cheque",
  "bank_transfer":  "Transferência",
  "other":          "Outro",
  // legado numérico (fallback)
  "1": "À vista", "2": "Boleto 30d", "3": "Boleto 60d",
  "4": "Cartão",  "5": "Pix",        "6": "Outro",
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MapaCotacaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [mapa, setMapa] = useState<MapaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"compra" | "fornecedor">("compra")
  const [selected, setSelected] = useState<Set<string>>(new Set()) // supplier_id[]
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    authFetch(`/api/cotacoes/${id}/mapa`)
      .then(r => r.json())
      .then(setMapa)
      .catch(() => toast.error("Erro ao carregar mapa"))
      .finally(() => setLoading(false))
  }, [id])

  // Menor preço por item (entre os que responderam)
  const minPrices = useMemo(() => {
    if (!mapa) return {}
    const map: Record<string, number> = {}
    mapa.items.forEach(item => {
      const prices = mapa.suppliers
        .flatMap(s => s.answered_items)
        .filter(ai => ai.cotacao_item_id === item.cotacao_item_id && ai.unit_price != null)
        .map(ai => ai.unit_price as number)
      if (prices.length > 0) map[item.cotacao_item_id] = Math.min(...prices)
    })
    return map
  }, [mapa])

  // Fornecedor com melhor oferta completa (modo Melhor Fornecedor)
  const bestSupplierId = useMemo(() => {
    if (!mapa) return null
    const answered = mapa.suppliers.filter(s => s.answered)
    const full = answered.filter(s =>
      mapa.items.every(item =>
        s.answered_items.find(ai => ai.cotacao_item_id === item.cotacao_item_id && ai.available && ai.unit_price != null)
      )
    )
    if (full.length === 0) return null
    return full.reduce((best, s) => s.total < best.total ? s : best, full[0]).supplier_id
  }, [mapa])

  function toggleSupplier(sid: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(sid) ? n.delete(sid) : n.add(sid)
      return n
    })
  }

  async function handleGenerate(supplierIds: string[]) {
    if (!mapa || !activeCompany?.id) return
    setGenerating(true)
    try {
      for (const sid of supplierIds) {
        const sup = mapa.suppliers.find(s => s.supplier_id === sid)
        if (!sup) continue
        await authFetch("/api/ordens-compra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: activeCompany.id,
            cotacao_id: mapa.cotacao_id,
            supplier_name: sup.supplier_name,
            supplier_email: sup.supplier_email ?? null,
            supplier_phone: sup.supplier_phone ?? null,
            items: sup.answered_items.filter(ai => ai.available && ai.unit_price != null),
            subtotal: sup.subtotal,
            freight: sup.freight ?? 0,
            total: sup.total,
            payment_method: sup.payment_method ?? null,
            arrival_estimate: sup.arrival_estimate ?? null,
            obraplay_answer_id: sup.obraplay_answer_id ?? null,
          }),
        })
      }
      toast.success(`${supplierIds.length} ordem(ns) de compra gerada(s)!`)
      setShowModal(false)
      router.push(`/dashboard/ordens-compra`)
    } catch {
      toast.error("Erro ao gerar ordens de compra")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )

  if (!mapa) return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-3 text-[#9E9E9E]">
      <AlertCircle size={36} strokeWidth={1.2} />
      <p className="text-sm">Mapa não encontrado.</p>
    </div>
  )

  const answeredSuppliers = mapa.suppliers.filter(s => s.answered)
  const selectedList = mapa.suppliers.filter(s => selected.has(s.supplier_id))

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32" style={{ maxWidth: 640, margin: "0 auto" }}>

      {/* Modal de confirmação de OCs */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white w-full rounded-t-2xl" style={{ maxWidth: 640 }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F5F5F5]">
              <p className="font-bold text-[#212121] text-sm">Confirmar geração de ordens de compra</p>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F5F5]">
                <X size={16} className="text-[#757575]" />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-[#757575]">
                Serão geradas <strong>{selectedList.length}</strong> {selectedList.length === 1 ? "ordem" : "ordens"} de compra:
              </p>
              {selectedList.map(s => (
                <div key={s.supplier_id} className="bg-[#F5F5F5] rounded-xl p-4 flex flex-col gap-1.5">
                  <p className="font-semibold text-sm text-[#212121]">{s.supplier_name}</p>
                  <p className="text-xs text-[#9E9E9E]">{s.answered_items.filter(i => i.available).length} itens</p>
                  <div className="flex justify-between text-xs text-[#616161]">
                    <span>Subtotal</span><span>{fmtBRL(s.subtotal)}</span>
                  </div>
                  {s.freight != null && (
                    <div className="flex justify-between text-xs text-[#616161]">
                      <span>Frete</span><span>{s.freight === 0 ? "Grátis" : fmtBRL(s.freight)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#212121] pt-1 border-t border-[#EEEEEE]">
                    <span>Total</span><span className="text-[#1565C0]">{fmtBRL(s.total)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[#F5F5F5] flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-[#616161] border border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleGenerate(selectedList.map(s => s.supplier_id))} disabled={generating}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#1565C0] hover:bg-[#0D47A1] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {generating ? "Gerando..." : "Confirmar e gerar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="h-1 w-full bg-[#1565C0]" />
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <ArrowLeft size={20} className="text-[#212121]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#9E9E9E]">Mapa de cotação</p>
            <h1 className="font-bold text-[#212121] text-sm truncate">
              {mapa.obra_name ?? mapa.obraplay_quotation_code ?? mapa.identifier}
            </h1>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success("Link copiado!")
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
            <Share2 size={17} className="text-[#1565C0]" />
          </button>
        </div>

        {/* Toggle modo */}
        <div className="flex gap-1 px-4 pb-3">
          <button onClick={() => setMode("compra")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${mode === "compra" ? "bg-[#1565C0] text-white" : "bg-[#F5F5F5] text-[#616161]"}`}>
            Melhor Compra
          </button>
          <button onClick={() => setMode("fornecedor")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${mode === "fornecedor" ? "bg-[#1565C0] text-white" : "bg-[#F5F5F5] text-[#616161]"}`}>
            Melhor Fornecedor
          </button>
        </div>
      </div>

      {/* Aviso sem respostas */}
      {answeredSuppliers.length === 0 && (
        <div className="mx-4 mt-4 bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-[#FF9800] flex-shrink-0" />
          <p className="text-sm text-[#E65100]">Nenhum fornecedor respondeu esta cotação ainda.</p>
        </div>
      )}

      {/* ── MODO MELHOR COMPRA ── */}
      {mode === "compra" && answeredSuppliers.length > 0 && (
        <div className="mt-4 overflow-x-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ minWidth: 380 }}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: 380 + answeredSuppliers.length * 110 }}>
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="px-3 py-3 text-left font-bold text-[#9E9E9E] uppercase tracking-wider sticky left-0 bg-[#F5F5F5] z-10 w-32">Item</th>
                  <th className="px-2 py-3 text-center font-bold text-[#9E9E9E] uppercase tracking-wider w-12">Un.</th>
                  <th className="px-2 py-3 text-center font-bold text-[#9E9E9E] uppercase tracking-wider w-12">Qtd.</th>
                  {answeredSuppliers.map(s => (
                    <th key={s.supplier_id} className="px-3 py-2 text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <div onClick={() => toggleSupplier(s.supplier_id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${selected.has(s.supplier_id) ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BDBDBD]"}`}>
                            {selected.has(s.supplier_id) && <Check size={9} className="text-white" />}
                          </div>
                          <span className="font-bold text-[#212121] text-[11px] leading-tight text-left">{s.supplier_name}</span>
                        </label>
                        {s.supplier_city && <span className="text-[10px] text-[#9E9E9E]">{s.supplier_city}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapa.items.map((item, idx) => (
                  <tr key={item.cotacao_item_id} className={idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                    <td className="px-3 py-2.5 font-medium text-[#212121] sticky left-0 z-10 text-xs" style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                      {item.name}
                    </td>
                    <td className="px-2 py-2.5 text-center text-[#757575]">{item.unit}</td>
                    <td className="px-2 py-2.5 text-center text-[#757575]">{item.quantity}</td>
                    {answeredSuppliers.map(s => {
                      const ai = s.answered_items.find(a => a.cotacao_item_id === item.cotacao_item_id)
                      // Fornecedor não respondeu este item ainda
                      if (!ai) {
                        return <td key={s.supplier_id} className="px-3 py-2.5 text-center text-[#BDBDBD] text-[10px]">—</td>
                      }
                      // Item marcado como indisponível
                      if (!ai.available) {
                        return <td key={s.supplier_id} className="px-3 py-2.5 text-center"><span className="text-[10px] text-[#F44336] font-medium">Indisponível</span></td>
                      }
                      const isBest = ai.unit_price != null && minPrices[item.cotacao_item_id] === ai.unit_price
                      return (
                        <td key={s.supplier_id} className="px-3 py-2.5 text-center"
                          style={isBest ? { background: "#E8F5E9" } : {}}>
                          <div className={`flex flex-col items-center ${isBest ? "text-[#2E7D32] font-bold" : "text-[#212121]"}`}>
                            <span>{fmtBRL(ai.unit_price)}</span>
                            <span className="text-[10px] font-bold opacity-80">{fmtBRL(ai.total_price)}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Rodapé por fornecedor */}
              <tfoot>
                <tr className="border-t-2 border-[#EEEEEE] bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10">Subtotal</td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-2 text-center text-xs text-[#616161]">{fmtBRL(s.subtotal)}</td>
                  ))}
                </tr>
                <tr className="bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10 flex items-center gap-1">
                    <Truck size={11} /> Frete
                  </td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-2 text-center text-xs text-[#616161]">
                      {s.free_shipping ? <span className="text-[#4CAF50] font-semibold">Grátis</span>
                        : s.freight == null ? "—"
                        : s.freight === 0 ? <span className="text-[#4CAF50] font-semibold">Grátis</span>
                        : fmtBRL(s.freight)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[#FAFAFA] border-t border-[#E0E0E0]">
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-[#212121] sticky left-0 bg-[#FAFAFA] z-10">TOTAL</td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-2.5 text-center text-xs font-bold text-[#1565C0]">{fmtBRL(s.total)}</td>
                  ))}
                </tr>
                <tr className="bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-1.5 text-xs text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10">Forma pgto.</td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-1.5 text-center text-[10px] text-[#757575]">
                      {s.payment_method ? (PAYMENT_LABELS[String(s.payment_method)] ?? s.payment_method) : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-1.5 text-xs text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10">Prazo entrega</td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-1.5 text-center text-[10px] text-[#757575]">
                      {fmtDate(s.arrival_estimate) ?? "—"}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── MODO MELHOR FORNECEDOR ── */}
      {mode === "fornecedor" && answeredSuppliers.length > 0 && (
        <div className="px-4 mt-4 flex flex-col gap-3">
          {bestSupplierId === null && (
            <div className="bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-[#FF9800] flex-shrink-0" />
              <p className="text-xs text-[#E65100]">Nenhum fornecedor ofertou todos os itens.</p>
            </div>
          )}
          {answeredSuppliers.map(s => {
            const isBest = s.supplier_id === bestSupplierId
            const availableCount = s.answered_items.filter(ai => ai.available && ai.unit_price != null).length
            return (
              <div key={s.supplier_id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${isBest ? "border-[#4CAF50]" : "border-transparent"}`}>
                {isBest && (
                  <div className="bg-[#4CAF50] px-4 py-1.5 flex items-center gap-2">
                    <TrendingDown size={13} className="text-white" />
                    <span className="text-xs font-bold text-white">Melhor oferta completa</span>
                  </div>
                )}
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-[#212121]">{s.supplier_name}</p>
                      {s.supplier_city && <p className="text-xs text-[#9E9E9E]">{s.supplier_city}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1565C0]">{fmtBRL(s.total)}</p>
                      <p className="text-[11px] text-[#9E9E9E]">{availableCount}/{mapa.items.length} itens</p>
                    </div>
                  </div>
                  {/* Itens resumidos */}
                  <div className="flex flex-col gap-1 mb-3">
                    {s.answered_items.map(ai => (
                      <div key={ai.cotacao_item_id} className="flex justify-between text-xs text-[#616161]">
                        <span className="truncate mr-2">{ai.name}</span>
                        {!ai.available
                          ? <span className="text-[#F44336] font-medium flex-shrink-0 text-[10px]">Indisponível</span>
                          : ai.unit_price != null
                            ? <span className="font-medium text-[#212121] flex-shrink-0">{fmtBRL(ai.total_price)}</span>
                            : <span className="text-[#BDBDBD] flex-shrink-0">—</span>
                        }
                      </div>
                    ))}
                  </div>
                  {/* Totais */}
                  <div className="border-t border-[#F5F5F5] pt-2 flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#757575]">
                      <span>Subtotal</span><span>{fmtBRL(s.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#757575]">
                      <span>Frete</span>
                      <span className={s.free_shipping || s.freight === 0 ? "text-[#4CAF50] font-semibold" : ""}>
                        {s.free_shipping || s.freight === 0 ? "Grátis" : s.freight == null ? "—" : fmtBRL(s.freight)}
                      </span>
                    </div>
                    {s.payment_method && (
                      <div className="flex justify-between text-xs text-[#757575]">
                        <span>Pagamento</span>
                        <span>{PAYMENT_LABELS[String(s.payment_method)] ?? s.payment_method}</span>
                      </div>
                    )}
                    {s.installments && (
                      <div className="flex justify-between text-xs text-[#757575]">
                        <span>Parcelas</span><span>{s.installments}</span>
                      </div>
                    )}
                    {s.arrival_estimate && (
                      <div className="flex justify-between text-xs text-[#757575]">
                        <span>Prazo entrega</span><span>{fmtDate(s.arrival_estimate)}</span>
                      </div>
                    )}
                  </div>
                  {/* Checkbox de seleção */}
                  <button type="button" onClick={() => toggleSupplier(s.supplier_id)}
                    className={`mt-3 w-full py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${selected.has(s.supplier_id) ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]" : "border-[#E0E0E0] text-[#616161] hover:border-[#1565C0]"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selected.has(s.supplier_id) ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BDBDBD]"}`}>
                      {selected.has(s.supplier_id) && <Check size={9} className="text-white" />}
                    </div>
                    {selected.has(s.supplier_id) ? "Selecionado" : "Selecionar"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botão flutuante de geração de OC */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 w-full" style={{ maxWidth: 640 }}>
          <button
            onClick={() => selected.size === 1 ? handleGenerate([...selected]) : setShowModal(true)}
            disabled={generating}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-2 hover:bg-[#0D47A1] disabled:opacity-60 transition-colors">
            {generating
              ? <Loader2 size={16} className="animate-spin" />
              : <ShoppingCart size={16} />
            }
            {generating ? "Gerando..." : `Gerar ${selected.size === 1 ? "ordem de compra" : `${selected.size} ordens de compra`}`}
          </button>
        </div>
      )}
    </div>
  )
}
