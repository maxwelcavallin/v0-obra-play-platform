"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Share2, Loader2, AlertCircle, ShoppingCart,
  Check, TrendingDown, Truck, X
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { RegistrationBadge } from "@/components/ui/registration-badge"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapaItem {
  id: string
  cotacao_item_id?: string
  name: string
  unit: string
  quantity: number
}

interface AnsweredItem {
  cotacao_item_id: string
  op_answered_item_id?: number | null
  name: string
  unit: string
  quantity: number
  answered: boolean
  available: boolean
  unit_price: number | null
  unit_price_micros?: number | null
  total_quantity_micros?: number | null
  total_discount_micros?: number | null
  total_price: number | null
  quantity_answered: number
  discount: number
}

interface SupplierMap {
  supplier_id: string
  supplier_name: string
  supplier_city?: string
  supplier_email?: string
  supplier_phone?: string
  is_recommended: boolean
  registration_type: "certified" | "validated" | "basic"
  mirror_company_id?: number
  obraplay_answer_id?: number | null
  answered: boolean
  /** R5: true somente se ofertou todos os itens sem "—" */
  is_eligible: boolean
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
  op_answered_address_id?: number | null
  total: number
  is_refused: boolean
}

interface MapaData {
  cotacao_id: string
  identifier: string
  obraplay_quotation_code?: string
  obra_name?: string
  status: string
  blocked_item_ids: string[]   // cotacao_item_ids já cobertos por OC ativa
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
  "cash":           "À vista",
  "bankslip":       "Boleto",
  "credit_card":    "Cartão de crédito",
  "debit_card":     "Cartão de débito",
  "pix":            "Pix",
  "check":          "Cheque",
  "bank_transfer":  "Transferência",
  "other":          "Outro",
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
  // Melhor Compra: seleção por item -> { [cotacao_item_id]: supplier_id }
  const [itemSelection, setItemSelection] = useState<Record<string, string>>({})
  // Melhor Fornecedor: seleção de fornecedor inteiro
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [tableAtEnd, setTableAtEnd] = useState(false)
  function onTableScroll() {
    const el = tableScrollRef.current
    if (!el) return
    setTableAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  useEffect(() => {
    authFetch(`/api/cotacoes/${id}/mapa`)
      .then(r => r.json())
      .then(setMapa)
      .catch(() => toast.error("Erro ao carregar mapa"))
      .finally(() => setLoading(false))
  }, [id])

  // Menor e maior preço unitário por item (para calcular economia)
  const minPrices = useMemo(() => {
    if (!mapa) return {}
    const map: Record<string, number> = {}
    mapa.items.forEach(item => {
      const itemId = item.id ?? item.cotacao_item_id
      const prices = mapa.suppliers
        .flatMap(s => s.answered_items)
        .filter(ai => ai.cotacao_item_id === itemId && ai.available && ai.unit_price != null)
        .map(ai => ai.unit_price as number)
      if (prices.length > 0) map[itemId] = Math.min(...prices)
    })
    return map
  }, [mapa])

  const maxPrices = useMemo(() => {
    if (!mapa) return {}
    const map: Record<string, number> = {}
    mapa.items.forEach(item => {
      const itemId = item.id ?? item.cotacao_item_id
      const prices = mapa.suppliers
        .flatMap(s => s.answered_items)
        .filter(ai => ai.cotacao_item_id === itemId && ai.available && ai.unit_price != null)
        .map(ai => ai.unit_price as number)
      if (prices.length > 0) map[itemId] = Math.max(...prices)
    })
    return map
  }, [mapa])

  // Maior e menor total por fornecedor (subtotal + frete)
  const { minTotal, maxTotal, minFreight, maxFreight } = useMemo(() => {
    if (!mapa) return { minTotal: 0, maxTotal: 0, minFreight: 0, maxFreight: 0 }
    const answered = mapa.suppliers.filter(s => s.answered)
    const totals  = answered.map(s => s.total)
    const freights = answered.map(s => s.free_shipping || s.freight === 0 ? 0 : (s.freight ?? 0))
    return {
      minTotal:   Math.min(...totals),
      maxTotal:   Math.max(...totals),
      minFreight: Math.min(...freights),
      maxFreight: Math.max(...freights),
    }
  }, [mapa])

  // Helper: percentual de economia (quanto este valor é menor que o referencial máximo)
  function savingPct(value: number, max: number): number | null {
    if (max <= 0 || value >= max) return null
    return Math.round((1 - value / max) * 100)
  }

  // Fornecedor com melhor oferta completa
  const bestSupplierId = useMemo(() => {
    if (!mapa) return null
    // R5: elegível apenas quem ofertou todos os itens (is_eligible vem da API)
    const eligible = mapa.suppliers.filter(s => s.is_eligible)
    if (eligible.length === 0) return null
    return eligible.reduce((best, s) => s.total < best.total ? s : best, eligible[0]).supplier_id
  }, [mapa])

  // Ordens agrupadas por fornecedor (modo Melhor Compra)
  const ordensPorFornecedor = useMemo(() => {
    if (!mapa) return []
    const grouped: Record<string, { supplier: SupplierMap; items: AnsweredItem[] }> = {}
    Object.entries(itemSelection).forEach(([itemId, supplierId]) => {
      const supplier = mapa.suppliers.find(s => s.supplier_id === supplierId)
      if (!supplier) return
      const ai = supplier.answered_items.find(a => a.cotacao_item_id === itemId)
      if (!ai || !ai.available) return
      if (!grouped[supplierId]) grouped[supplierId] = { supplier, items: [] }
      grouped[supplierId].items.push(ai)
    })
    return Object.values(grouped).map(({ supplier, items }) => {
      const subtotal = items.reduce((s, i) => s + (i.total_price ?? 0), 0)
      const freight = supplier.free_shipping ? 0 : (supplier.freight ?? null)
      const total = freight != null ? subtotal + freight : subtotal
      return { supplier, items, subtotal, freight, total }
    })
  }, [mapa, itemSelection])

  // Itens e fornecedores bloqueados por OC ativa
  const blockedIds = useMemo(() => new Set(mapa?.blocked_item_ids ?? []), [mapa])
  const allItemsBlocked = useMemo(
    () => !!mapa && mapa.items.length > 0 && mapa.items.every(i => blockedIds.has(i.id ?? i.cotacao_item_id)),
    [mapa, blockedIds]
  )
  // Fornecedor completamente coberto = todos os seus itens disponíveis já têm OC ativa
  const isSupplierFullyBlocked = (sup: SupplierMap) =>
    sup.answered_items
      .filter(ai => ai.available && ai.unit_price != null)
      .every(ai => blockedIds.has(ai.cotacao_item_id))

  function selectItemSupplier(itemId: string, supplierId: string) {
    if (blockedIds.has(itemId)) return          // item já coberto — não permite selecionar
    setItemSelection(prev => {
      if (prev[itemId] === supplierId) {
        const n = { ...prev }
        delete n[itemId]
        return n
      }
      return { ...prev, [itemId]: supplierId }
    })
  }

  function toggleSupplier(sid: string) {
    // R6: apenas 1 fornecedor pode estar selecionado por vez no modo Melhor Fornecedor
    setSelectedSuppliers(prev => {
      if (prev.has(sid)) return new Set<string>()   // deseleciona se já estava marcado
      return new Set<string>([sid])                  // seleciona somente este, limpa os demais
    })
  }

  async function postOrdem(body: object): Promise<{ ok: boolean; errorMsg?: string; isDuplicate?: boolean }> {
    const res = await authFetch("/api/ordens-compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let json: any = {}
      try { json = await res.json() } catch {}
      const isDuplicate = res.status === 409
      const msg = [json.error, json.detail, json.support].filter(Boolean).join(" ")
      return { ok: false, errorMsg: msg || "Erro ao gerar ordem de compra.", isDuplicate }
    }
    return { ok: true }
  }

  async function handleGenerateCompra() {
    if (!mapa || !activeCompany?.id || ordensPorFornecedor.length === 0) return
    setGenerating(true)
    try {
      for (const { supplier, items, subtotal, freight, total } of ordensPorFornecedor) {
        const result = await postOrdem({
          company_id: activeCompany.id,
          cotacao_id: mapa.cotacao_id,
          supplier_name: supplier.supplier_name,
          supplier_email: supplier.supplier_email ?? null,
          supplier_phone: supplier.supplier_phone ?? null,
          items,
          subtotal,
          freight: freight ?? 0,
          total,
          payment_method: supplier.payment_method ?? null,
          arrival_estimate: supplier.arrival_estimate ?? null,
          obraplay_answer_id: supplier.obraplay_answer_id ?? null,
          obraplay_address_id: supplier.op_answered_address_id ?? null,
        })
        if (!result.ok) {
          if (result.isDuplicate) {
            toast.error(result.errorMsg ?? "Já existe uma OC para este fornecedor.", { duration: 6000 })
            setShowModal(false)
            router.push(`/dashboard/ordens-compra`)
          } else {
            toast.error(result.errorMsg ?? "Erro ao gerar ordem de compra.", { duration: 8000 })
          }
          return
        }
      }
      toast.success(`${ordensPorFornecedor.length} ordem(ns) de compra gerada(s) com sucesso!`)
      setShowModal(false)
      router.push(`/dashboard/ordens-compra`)
    } catch {
      toast.error("Erro inesperado ao gerar ordens de compra. Entre em contato com o suporte.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateFornecedor(supplierIds: string[]) {
    if (!mapa || !activeCompany?.id) return
    setGenerating(true)
    try {
      for (const sid of supplierIds) {
        const sup = mapa.suppliers.find(s => s.supplier_id === sid)
        if (!sup) continue
        // Somente itens que pertencem à cotação, foram ofertados, estão disponíveis e não têm OC ativa
        const cotacaoItemIds = new Set(mapa.items.map(i => i.id ?? i.cotacao_item_id))
        const eligibleItems = sup.answered_items.filter(ai =>
          cotacaoItemIds.has(ai.cotacao_item_id) &&
          ai.available &&
          ai.unit_price != null &&
          !blockedIds.has(ai.cotacao_item_id)
        )
        if (eligibleItems.length === 0) {
          toast.error(`${sup.supplier_name} não tem itens disponíveis para gerar OC.`)
          continue
        }
        const subtotal = eligibleItems.reduce((s, ai) => s + (ai.total_price ?? 0), 0)
        const freight  = sup.free_shipping ? 0 : (sup.freight ?? 0)
        const total    = subtotal + freight

        const result = await postOrdem({
          company_id: activeCompany.id,
          cotacao_id: mapa.cotacao_id,
          supplier_name: sup.supplier_name,
          supplier_email: sup.supplier_email ?? null,
          supplier_phone: sup.supplier_phone ?? null,
          items: eligibleItems,
          subtotal,
          freight,
          total,
          payment_method: sup.payment_method ?? null,
          arrival_estimate: sup.arrival_estimate ?? null,
          obraplay_answer_id: sup.obraplay_answer_id ?? null,
          obraplay_address_id: sup.op_answered_address_id ?? null,
        })
        if (!result.ok) {
          if (result.isDuplicate) {
            toast.error(result.errorMsg ?? "Já existe uma OC para este fornecedor.", { duration: 6000 })
            setShowModal(false)
            router.push(`/dashboard/ordens-compra`)
          } else {
            toast.error(result.errorMsg ?? "Erro ao gerar ordem de compra.", { duration: 8000 })
          }
          return
        }
      }
      toast.success(`${supplierIds.length} ordem(ns) de compra gerada(s) com sucesso!`)
      setShowModal(false)
      router.push(`/dashboard/ordens-compra`)
    } catch {
      toast.error("Erro inesperado ao gerar ordens de compra. Entre em contato com o suporte.")
    } finally {
      setGenerating(false)
    }
  }

  // Economia total da seleção atual (Melhor Compra) — deve ficar antes dos early returns
  const compraSavings = useMemo(() => {
    if (!mapa || ordensPorFornecedor.length === 0) return null
    const totalSelecionado = ordensPorFornecedor.reduce((s, o) => s + o.total, 0)
    const worstItems = mapa.items.reduce((acc, item) => {
      const itemId = item.id ?? item.cotacao_item_id
      const worst = maxPrices[itemId]
      return acc + (worst != null ? worst * item.quantity : 0)
    }, 0)
    const worstFreight = maxFreight * ordensPorFornecedor.length
    const worstTotal = worstItems + worstFreight
    if (worstTotal <= 0 || totalSelecionado >= worstTotal) return null
    return {
      pct: Math.round((1 - totalSelecionado / worstTotal) * 100),
      valor: worstTotal - totalSelecionado,
    }
  }, [mapa, ordensPorFornecedor, maxPrices, maxFreight])

  // Economia total no modo Melhor Fornecedor — deve ficar antes dos early returns
  const fornecedorSavings = useMemo(() => {
    if (!mapa) return null
    const list = mapa.suppliers.filter(s => selectedSuppliers.has(s.supplier_id))
    if (list.length === 0) return null
    const totalSelecionado = list.reduce((s, sup) => s + sup.total, 0)
    const pct = savingPct(totalSelecionado, maxTotal * list.length)
    const valor = maxTotal * list.length - totalSelecionado
    return pct != null && pct > 0 ? { pct, valor } : null
  }, [mapa, selectedSuppliers, maxTotal])

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

  // Derivações simples (sem hooks) — seguro após os early returns

  // Regra de ordenação das propostas (Melhor Compra e Melhor Fornecedor):
  //   1. Melhor preço entre os credenciados  → único fornecedor credenciado elegível com menor total
  //   2. Melhor preço geral                  → único fornecedor elegível (qualquer) com menor total
  //   3. Credenciados restantes              → is_recommended, ordenado por total
  //   4. Fornecedores gerais                 → demais, ordenado por total
  //
  // "Melhor preço credenciado" e "Melhor preço geral" são posições únicas (o #1 de cada grupo).
  // Os demais credenciados vão para o grupo 3; os demais gerais vão para o grupo 4.

  const _eligible      = mapa.suppliers.filter(s => s.answered && !s.is_refused && s.is_eligible)
  const _eligibleRec   = _eligible.filter(s => s.is_recommended)

  // Menor total entre credenciados elegíveis (grupo 1 — pode ser nulo se não houver)
  const _minRecTotal   = _eligibleRec.length > 0
    ? Math.min(..._eligibleRec.map(s => s.total ?? Infinity))
    : null

  // Menor total entre todos elegíveis (grupo 2)
  const _minAllTotal   = _eligible.length > 0
    ? Math.min(..._eligible.map(s => s.total ?? Infinity))
    : null

  // IDs dos fornecedores que ocupam as posições de topo (para não repeti-los)
  const _group1Id = _eligibleRec.find(s => (s.total ?? Infinity) === _minRecTotal)?.supplier_id ?? null
  const _group2Id = _eligible.find(s =>
    (s.total ?? Infinity) === _minAllTotal && s.supplier_id !== _group1Id
  )?.supplier_id ?? null

  function rankSupplier(s: SupplierMap): number {
    if (s.supplier_id === _group1Id) return 0  // melhor preço entre credenciados
    if (s.supplier_id === _group2Id) return 1  // melhor preço geral
    if (s.is_recommended)            return 2  // credenciados restantes
    return 3                                    // fornecedores gerais
  }

  const answeredSuppliers = mapa.suppliers
    .filter(s => s.answered && !s.is_refused)
    .sort((a, b) => {
      const rankDiff = rankSupplier(a) - rankSupplier(b)
      if (rankDiff !== 0) return rankDiff
      return (a.total ?? 0) - (b.total ?? 0)   // desempate dentro do mesmo grupo: menor total primeiro
    })
  const refusedSuppliers = mapa.suppliers.filter(s => s.is_refused)
  const selectedSupplierList = mapa.suppliers.filter(s => selectedSuppliers.has(s.supplier_id))
  const hasCompraSelection = ordensPorFornecedor.length > 0

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32" style={{ maxWidth: 640, margin: "0 auto" }}>

      {/* Modal confirmação — Melhor Compra */}
      {showModal && mode === "compra" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white w-full rounded-t-2xl" style={{ maxWidth: 640 }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F5F5F5]">
              <p className="font-bold text-[#212121] text-sm">Confirmar ordens de compra</p>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F5F5]">
                <X size={16} className="text-[#757575]" />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-[#757575]">
                Serão geradas <strong>{ordensPorFornecedor.length}</strong> {ordensPorFornecedor.length === 1 ? "ordem" : "ordens"} de compra:
              </p>
              {ordensPorFornecedor.map(({ supplier, items, subtotal, freight, total }) => (
                <div key={supplier.supplier_id} className="bg-[#F5F5F5] rounded-xl p-4 flex flex-col gap-1.5">
                  <p className="font-semibold text-sm text-[#212121]">{supplier.supplier_name}</p>
                  {items.map(ai => (
                    <div key={ai.cotacao_item_id} className="flex justify-between text-xs text-[#616161]">
                      <span className="truncate mr-2">{ai.name} ({ai.quantity_answered} {ai.unit})</span>
                      <span className="flex-shrink-0 font-medium text-[#212121]">{fmtBRL(ai.total_price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-[#616161] pt-1 border-t border-[#E0E0E0]">
                    <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
                  </div>
                  {freight != null && (
                    <div className="flex justify-between text-xs text-[#616161]">
                      <span>Frete</span>
                      <span className={freight === 0 ? "text-[#4CAF50] font-semibold" : ""}>{freight === 0 ? "Grátis" : fmtBRL(freight)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#212121] pt-1 border-t border-[#EEEEEE]">
                    <span>Total</span><span className="text-[#1565C0]">{fmtBRL(total)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[#F5F5F5] flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-[#616161] border border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors">
                Cancelar
              </button>
              <button onClick={handleGenerateCompra} disabled={generating}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#1565C0] hover:bg-[#0D47A1] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {generating ? "Gerando..." : "Confirmar e gerar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação — Melhor Fornecedor */}
      {showModal && mode === "fornecedor" && (
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
                Serão geradas <strong>{selectedSupplierList.length}</strong> {selectedSupplierList.length === 1 ? "ordem" : "ordens"} de compra:
              </p>
              {selectedSupplierList.map(s => (
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
              <button onClick={() => handleGenerateFornecedor(selectedSupplierList.map(s => s.supplier_id))} disabled={generating}
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
            onClick={async () => {
              try {
                const res = await authFetch(`/api/cotacoes/${id}/share`)
                const json = await res.json()
                await navigator.clipboard.writeText(json.url)
                toast.success("Link público copiado!", {
                  description: "Compartilhe com o cliente para visualização.",
                  duration: 4000,
                })
              } catch {
                toast.error("Erro ao gerar link de compartilhamento")
              }
            }}
            title="Compartilhar mapa (link público, somente leitura)"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1565C0] bg-[#E3F2FD] hover:bg-[#BBDEFB] px-3 py-1.5 rounded-full transition-colors">
            <Share2 size={13} />
            Compartilhar
          </button>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          <button
            onClick={() => setMode("compra")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors relative ${mode === "compra" ? "bg-[#1565C0] text-white" : "bg-[#F5F5F5] text-[#616161]"}`}>
            Melhor Compra
            {/* badge: qtd de itens selecionados neste modo */}
            {mode !== "compra" && Object.keys(itemSelection).length > 0 && (
              <span className="absolute -top-1.5 -right-1 min-w-[16px] h-4 bg-[#1565C0] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {Object.keys(itemSelection).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMode("fornecedor")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors relative ${mode === "fornecedor" ? "bg-[#1565C0] text-white" : "bg-[#F5F5F5] text-[#616161]"}`}>
            Melhor Fornecedor
            {/* badge: fornecedor selecionado neste modo */}
            {mode !== "fornecedor" && selectedSuppliers.size > 0 && (
              <span className="absolute -top-1.5 -right-1 min-w-[16px] h-4 bg-[#1565C0] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {selectedSuppliers.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {answeredSuppliers.length === 0 && (
        <div className="mx-4 mt-4 bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={18} className="text-[#FF9800] flex-shrink-0" />
          <p className="text-sm text-[#E65100]">Nenhum fornecedor respondeu esta cotação ainda.</p>
        </div>
      )}

      {allItemsBlocked && (
        <div className="mx-4 mt-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl p-4 flex items-center gap-3">
          <ShoppingCart size={18} className="text-[#2E7D32] flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#2E7D32]">Todos os itens já possuem Ordem de Compra</p>
            <p className="text-xs text-[#388E3C] mt-0.5">Para gerar novas OCs, cancele as existentes ou aguarde novos itens na cotação.</p>
          </div>
        </div>
      )}

      {/* ── MODO MELHOR COMPRA ── */}
      {mode === "compra" && answeredSuppliers.length > 0 && (
        <div className="mt-4">
          {/* Banner: seleção atual + economia total */}
          {hasCompraSelection && (
            <div className="mx-4 mb-3 flex flex-col gap-1.5">
              <div className="bg-[#E3F2FD] border border-[#BBDEFB] rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-[#1565C0] flex-shrink-0" />
                  <p className="text-xs text-[#1565C0] font-medium">
                    {Object.keys(itemSelection).length} {Object.keys(itemSelection).length === 1 ? "item" : "itens"} de {ordensPorFornecedor.length} {ordensPorFornecedor.length === 1 ? "fornecedor" : "fornecedores"}
                  </p>
                </div>
                {compraSavings != null && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex-shrink-0">
                    -{compraSavings.pct}% economia ({fmtBRL(compraSavings.valor)})
                  </span>
                )}
              </div>
            </div>
          )}
          {/* Scroll lateral na tabela */}
          <div className="px-4 relative">
            {/* Fade direita — some quando chega ao fim */}
            {answeredSuppliers.length > 1 && !tableAtEnd && (
              <div
                className="pointer-events-none absolute top-0 right-4 bottom-0 w-12 z-20 rounded-r-2xl"
                style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.95))" }}
              />
            )}
          <div
            ref={tableScrollRef}
            onScroll={onTableScroll}
            className="overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          <div className="bg-white rounded-2xl shadow-sm" style={{ minWidth: 360 + answeredSuppliers.length * 140 }}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: 380 + answeredSuppliers.length * 120 }}>
              <thead>
                <tr className="bg-[#F5F5F5]">
                  <th className="px-3 py-3 text-left font-bold text-[#9E9E9E] uppercase tracking-wider sticky left-0 bg-[#F5F5F5] z-10 w-32">Item</th>
                  <th className="px-2 py-3 text-center font-bold text-[#9E9E9E] uppercase tracking-wider w-12">Un.</th>
                  <th className="px-2 py-3 text-center font-bold text-[#9E9E9E] uppercase tracking-wider w-12">Qtd.</th>
                  {answeredSuppliers.map(s => (
                    <th key={s.supplier_id} className="px-3 py-2 text-center min-w-[130px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold text-[#212121] text-[11px] leading-tight text-center">{s.supplier_name}</span>
                        {s.supplier_city && <span className="text-[10px] text-[#9E9E9E]">{s.supplier_city}</span>}
                        <RegistrationBadge type={s.registration_type} variant="pill" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapa.items.map((item, idx) => {
                  const itemId = item.id ?? item.cotacao_item_id
                  return (
                    <tr key={itemId} className={idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                      <td className="px-3 py-2.5 font-medium text-[#212121] sticky left-0 z-10 text-xs leading-snug" style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        {item.name}
                      </td>
                      <td className="px-2 py-2.5 text-center text-[#757575]">{item.unit}</td>
                      <td className="px-2 py-2.5 text-center text-[#757575]">{item.quantity}</td>
                      {answeredSuppliers.map(s => {
                        const ai = s.answered_items.find(a => a.cotacao_item_id === itemId)
                        const isSelected = itemSelection[itemId] === s.supplier_id
                        const isBlocked  = blockedIds.has(itemId)

                        if (!ai) {
                          return <td key={s.supplier_id} className="px-3 py-2.5 text-center"><span className="text-[10px] text-[#9E9E9E]">Não possui</span></td>
                        }
                        if (!ai.available) {
                          return (
                            <td key={s.supplier_id} className="px-3 py-2.5 text-center">
                              <span className="text-[10px] text-[#9E9E9E]">Não possui</span>
                            </td>
                          )
                        }

                        // Item bloqueado: já tem OC ativa
                        if (isBlocked) {
                          return (
                            <td key={s.supplier_id} className="px-3 py-2.5 text-center bg-[#F5F5F5] opacity-60">
                              <div className="flex flex-col items-center gap-1">
                                <ShoppingCart size={12} className="text-[#4CAF50]" />
                                <span className="text-[9px] font-bold text-[#4CAF50] bg-[#E8F5E9] px-1.5 py-0.5 rounded-full">OC gerada</span>
                                <span className="text-[10px] text-[#9E9E9E]">{fmtBRL(ai.unit_price)}</span>
                              </div>
                            </td>
                          )
                        }

                        const isBest = ai.unit_price != null && minPrices[itemId] === ai.unit_price
                        const pct = ai.unit_price != null ? savingPct(ai.unit_price, maxPrices[itemId]) : null
                        return (
                          <td key={s.supplier_id}
                            onClick={() => selectItemSupplier(itemId, s.supplier_id)}
                            className="px-3 py-2 text-center cursor-pointer transition-all select-none"
                            style={{
                              background: isSelected ? "#DBEAFE" : isBest ? "#E8F5E9" : undefined,
                              outline: isSelected ? "2px solid #1565C0" : isBest ? "2px solid #A5D6A7" : undefined,
                              outlineOffset: "-2px",
                            }}>
                            <div className="flex flex-col items-center gap-1">
                              {/* Checkbox visual */}
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-[#1565C0] border-[#1565C0]" : isBest ? "border-[#4CAF50]" : "border-[#BDBDBD]"}`}>
                                {isSelected && <Check size={9} className="text-white" />}
                              </div>
                              {/* Preço unitário — bold verde quando menor da linha */}
                              <span className={`font-bold text-[12px] ${isSelected ? "text-[#1565C0]" : isBest ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                                {fmtBRL(ai.unit_price)}
                              </span>
                              {/* Preço total — bold verde quando menor da linha */}
                              <span className={`text-[10px] ${isBest && !isSelected ? "font-bold text-[#2E7D32]" : "text-[#9E9E9E]"}`}>total {fmtBRL(ai.total_price)}</span>
                              {/* Badge economia */}
                              {pct != null && pct > 0 && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">
                                  -{pct}%
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#EEEEEE] bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10">Subtotal</td>
                  {answeredSuppliers.map(s => (
                    <td key={s.supplier_id} className="px-3 py-2 text-center text-xs text-[#616161]">{fmtBRL(s.subtotal)}</td>
                  ))}
                </tr>
                <tr className="bg-[#FAFAFA]">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[#9E9E9E] sticky left-0 bg-[#FAFAFA] z-10">
                    <span className="inline-flex items-center gap-1"><Truck size={11} /> Frete</span>
                  </td>
                  {answeredSuppliers.map(s => {
                    const frVal = s.free_shipping || s.freight === 0 ? 0 : (s.freight ?? null)
                    const frPct = frVal != null ? savingPct(frVal, maxFreight) : null
                    return (
                      <td key={s.supplier_id} className="px-3 py-2 text-center text-xs">
                        <div className="flex flex-col items-center gap-0.5">
                          {frVal === 0
                            ? <span className="text-[#4CAF50] font-semibold">Grátis</span>
                            : frVal == null ? <span className="text-[#BDBDBD]">—</span>
                            : <span className="text-[#616161]">{fmtBRL(frVal)}</span>}
                          {frPct != null && frPct > 0 && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">-{frPct}%</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
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
          </div>{/* fim overflow-x-auto scrollRef */}
          {/* Pill de dica de scroll — visível apenas quando há mais de 1 fornecedor e ainda não chegou ao fim */}
          {answeredSuppliers.length > 1 && !tableAtEnd && (
            <div className="flex justify-center mt-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-[#9E9E9E] bg-white border border-[#EEEEEE] rounded-full px-3 py-1 shadow-sm select-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Deslize para ver mais fornecedores
              </span>
            </div>
          )}
          </div>{/* fim px-4 relative */}
        </div>
      )}

      {/* ── MODO MELHOR FORNECEDOR ── */}
      {mode === "fornecedor" && answeredSuppliers.length > 0 && (
        <>
        <div className="px-4 mt-4 flex flex-col gap-3">
          {bestSupplierId === null && (
            <div className="bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-[#FF9800] flex-shrink-0" />
              <p className="text-xs text-[#E65100]">Nenhum fornecedor ofertou todos os itens.</p>
            </div>
          )}
          {answeredSuppliers.map(s => {
            const isBest      = s.supplier_id === bestSupplierId
            const isFullBlock = isSupplierFullyBlocked(s)
            const availableCount = s.answered_items.filter(ai => ai.available && ai.unit_price != null).length
            return (
              <div key={s.supplier_id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${isFullBlock ? "border-[#4CAF50] opacity-70" : isBest ? "border-[#4CAF50]" : "border-transparent"}`}>
                {isFullBlock && (
                  <div className="bg-[#4CAF50] px-4 py-1.5 flex items-center gap-2">
                    <ShoppingCart size={13} className="text-white" />
                    <span className="text-xs font-bold text-white">Ordem de Compra já gerada</span>
                  </div>
                )}
                {!isFullBlock && isBest && (
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
                        <RegistrationBadge type={s.registration_type} variant="pill" className="mt-1" />
                      </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1565C0]">{fmtBRL(s.total)}</p>
                      <p className="text-[11px] text-[#9E9E9E]">{availableCount}/{mapa.items.length} itens</p>
                      {/* Economia total vs. fornecedor mais caro */}
                      {(() => {
                        const pct = savingPct(s.total, maxTotal)
                        return pct != null && pct > 0 ? (
                          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                            -{pct}% mais barato
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {/* Itens com preço unitário, total e economia */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    {s.answered_items.map(ai => {
                      const itemId = ai.cotacao_item_id
                      const isBestItem = ai.unit_price != null && minPrices[itemId] === ai.unit_price
                      const pct = ai.unit_price != null ? savingPct(ai.unit_price, maxPrices[itemId]) : null
                      return (
                        <div
                          key={itemId}
                          className="flex justify-between items-start text-xs rounded-md px-1.5 py-1 -mx-1.5 transition-colors"
                          style={{ background: isBestItem ? "#E8F5E9" : undefined }}
                        >
                          <span className={`truncate mr-2 flex-1 ${isBestItem ? "text-[#2E7D32] font-medium" : "text-[#616161]"}`}>{ai.name}</span>
                          {(!ai.available || ai.unit_price == null)
                            ? <span className="text-[#9E9E9E] flex-shrink-0 text-[10px]">Não possui</span>
                            : (
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <span className={`font-bold ${isBestItem ? "text-[#2E7D32]" : "text-[#212121]"}`}>
                                    {fmtBRL(ai.unit_price)}<span className={`font-normal ${isBestItem ? "text-[#4CAF50]" : "text-[#9E9E9E]"}`}>/{ai.unit}</span>
                                  </span>
                                  <span className={`text-[10px] ${isBestItem ? "font-bold text-[#2E7D32]" : "text-[#9E9E9E]"}`}>total {fmtBRL(ai.total_price)}</span>
                                  {pct != null && pct > 0 && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">-{pct}%</span>
                                  )}
                                </div>
                              )
                          }
                        </div>
                      )
                    })}
                  </div>

                  {/* Totais e condições */}
                  <div className="border-t border-[#F5F5F5] pt-2 flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-[#757575]">
                      <span>Subtotal</span><span>{fmtBRL(s.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#757575]">
                      <span>Frete</span>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const frVal = s.free_shipping || s.freight === 0 ? 0 : (s.freight ?? null)
                          const frPct = frVal != null ? savingPct(frVal, maxFreight) : null
                          return (
                            <>
                              <span className={s.free_shipping || s.freight === 0 ? "text-[#4CAF50] font-semibold" : ""}>
                                {s.free_shipping || s.freight === 0 ? "Grátis" : s.freight == null ? "—" : fmtBRL(s.freight)}
                              </span>
                              {frPct != null && frPct > 0 && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">-{frPct}%</span>
                              )}
                            </>
                          )
                        })()}
                      </div>
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

                  {/* Botão WhatsApp */}
                  {s.supplier_phone && (
                    <a
                      href={`https://wa.me/${s.supplier_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi sua cotação no ObraPlay e gostaria de negociar.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full py-2 rounded-xl border-2 border-[#25D366] text-[#25D366] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#F1FFF5] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Negocie com o fornecedor
                    </a>
                  )}

                  {isFullBlock ? (
                    <div className="mt-3 w-full py-2 rounded-xl border-2 border-[#C8E6C9] bg-[#F1F8E9] text-[#388E3C] text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      <ShoppingCart size={13} />
                      OC já gerada para este fornecedor
                    </div>
                  ) : (
                    <button type="button" onClick={() => toggleSupplier(s.supplier_id)}
                      className={`mt-3 w-full py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${selectedSuppliers.has(s.supplier_id) ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]" : "border-[#E0E0E0] text-[#616161] hover:border-[#1565C0]"}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedSuppliers.has(s.supplier_id) ? "bg-[#1565C0] border-[#1565C0]" : "border-[#BDBDBD]"}`}>
                        {selectedSuppliers.has(s.supplier_id) && <Check size={9} className="text-white" />}
                      </div>
                      {selectedSuppliers.has(s.supplier_id) ? "Selecionado" : "Selecionar para OC"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Fornecedores que recusaram a cotação */}
        {refusedSuppliers.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide px-1">Recusaram a cotação</p>
            {refusedSuppliers.map(s => (
              <div key={s.supplier_id} className="rounded-2xl border border-[#FFCDD2] bg-[#FFF8F8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#C62828]">{s.supplier_name}</p>
                    {s.supplier_city && <p className="text-xs text-[#9E9E9E]">{s.supplier_city}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#FEECEC] text-[#C62828]">
                    Recusado
                  </span>
                </div>
                {s.supplier_phone && (
                  <a
                    href={`https://wa.me/${s.supplier_phone.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vi que recusou nossa cotação no ObraPlay. Gostaria de entender o motivo e negociar.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full py-2 rounded-xl border-2 border-[#25D366] text-[#25D366] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#F1FFF5] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Entender motivo da recusa
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        </>
      )}

      {/* Botão flutuante — Melhor Compra */}
      {mode === "compra" && hasCompraSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 w-full" style={{ maxWidth: 640 }}>
          <button
            onClick={() => setShowModal(true)}
            disabled={generating}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-2 hover:bg-[#0D47A1] disabled:opacity-60 transition-colors">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            <span>
              {generating
                ? "Gerando..."
                : `Gerar ${ordensPorFornecedor.length === 1 ? "OC" : `${ordensPorFornecedor.length} OCs`} · ${Object.keys(itemSelection).length} itens`}
            </span>
            {!generating && compraSavings != null && (
              <span className="ml-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                -{compraSavings.pct}%
              </span>
            )}
          </button>
        </div>
      )}

      {/* Botão flutuante — Melhor Fornecedor */}
      {mode === "fornecedor" && selectedSuppliers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 w-full" style={{ maxWidth: 640 }}>
          <button
            onClick={() => selectedSuppliers.size === 1
              ? handleGenerateFornecedor([...selectedSuppliers])
              : setShowModal(true)}
            disabled={generating}
            className="w-full py-3.5 rounded-2xl bg-[#1565C0] text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-2 hover:bg-[#0D47A1] disabled:opacity-60 transition-colors">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            <span>
              {generating
                ? "Gerando..."
                : `Gerar ${selectedSuppliers.size === 1 ? "OC" : `${selectedSuppliers.size} OCs`} · ${fmtBRL(selectedSupplierList.reduce((s, sup) => s + sup.total, 0))}`}
            </span>
            {!generating && fornecedorSavings != null && (
              <span className="ml-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                -{fornecedorSavings.pct}%
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
