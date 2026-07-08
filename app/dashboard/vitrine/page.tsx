"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import {
  ShoppingCart, Search, Package, X, Plus, Minus, Trash2, ChevronRight,
  SlidersHorizontal, Building2, ArrowRight, AlertTriangle, Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => authFetch(url).then(r => r.json())

function fmtBRL(micros?: number | null) {
  if (micros == null) return null
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(micros / 1_000_000)
}

interface ShowcaseItem {
  id: string
  name: string
  slug: string
  unit: string
  description?: string
  image_url?: string
  min_price_micros?: number
  max_price_micros?: number
  avg_price_micros?: number
  category_name?: string
  category_slug?: string
}

interface Category {
  id: string
  name: string
  slug: string
  count: number
}

interface CartItem {
  id: string
  item_id: string
  name: string
  unit: string
  image_url?: string
  quantity: number
  min_price_micros?: number
  max_price_micros?: number
  avg_price_micros?: number
  locked_price_micros?: number // preço travado na adição
}

interface Obra {
  id: string
  name: string
  status: string
  city?: string
}

type SortOption = "nome" | "preco_asc" | "preco_desc"

export default function VitrinePage() {
  const { activeCompany } = useAuth()
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [sort, setSort] = useState<SortOption>("nome")
  const [page, setPage] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedObraId, setSelectedObraId] = useState<string>("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const PER = 24

  // Items
  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page) })
    if (search) p.set("search", search)
    if (selectedCategory) p.set("category", selectedCategory)
    return p.toString()
  }, [page, search, selectedCategory])

  const { data: itemsData, isLoading } = useSWR(`/api/vitrine/items?${params}`, fetcher)
  const items: ShowcaseItem[] = useMemo(() => {
    const raw: ShowcaseItem[] = itemsData?.items ?? []
    const sorted = [...raw]
    if (sort === "preco_asc") sorted.sort((a, b) => (a.min_price_micros ?? Infinity) - (b.min_price_micros ?? Infinity))
    if (sort === "preco_desc") sorted.sort((a, b) => (b.min_price_micros ?? 0) - (a.min_price_micros ?? 0))
    return sorted
  }, [itemsData, sort])
  const categories: Category[] = itemsData?.categories ?? []
  const total: number = itemsData?.total ?? 0
  const totalPages = Math.ceil(total / PER)

  // Carrinho
  const { data: cartData, mutate: mutateCart } = useSWR("/api/vitrine/carrinho", fetcher)
  const cart: CartItem[] = cartData?.items ?? []
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  // Obras
  const { data: obrasData } = useSWR(
    activeCompany?.id ? `/api/obras?company_id=${activeCompany.id}` : null,
    fetcher
  )
  const obras: Obra[] = (obrasData?.obras ?? obrasData ?? []).filter((o: Obra) => o.status !== "Concluída")

  const selectedObra = obras.find(o => o.id === selectedObraId)

  const isInCart = (itemId: string) => cart.some(c => c.item_id === itemId)
  const cartItemQty = (itemId: string) => cart.find(c => c.item_id === itemId)?.quantity ?? 0

  async function addToCart(item: ShowcaseItem) {
    if (!selectedObraId) { toast.error("Selecione uma obra primeiro"); return }
    const qty = quantities[item.id] ?? 1
    setAddingId(item.id)
    try {
      await authFetch("/api/vitrine/carrinho", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id, quantity: qty }),
      })
      await mutateCart()
      toast.success(`${item.name} adicionado`)
    } catch {
      toast.error("Erro ao adicionar ao carrinho")
    } finally {
      setAddingId(null)
    }
  }

  async function updateCartQty(itemId: string, newQty: number) {
    if (newQty <= 0) return removeFromCart(itemId)
    await authFetch("/api/vitrine/carrinho", {
      method: "POST",
      body: JSON.stringify({ item_id: itemId, quantity: newQty }),
    })
    await mutateCart()
  }

  async function removeFromCart(itemId: string) {
    setRemovingId(itemId)
    await authFetch("/api/vitrine/carrinho", {
      method: "DELETE",
      body: JSON.stringify({ item_id: itemId }),
    })
    await mutateCart()
    setRemovingId(null)
  }

  const cartTotal = cart.reduce((s, c) => {
    const price = c.locked_price_micros ?? c.avg_price_micros ?? c.min_price_micros ?? 0
    return s + (price * c.quantity) / 1_000_000
  }, 0)

  const canCheckout = selectedObraId && cart.length > 0

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Banner: Comprando para qual obra? */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Building2 size={16} className="text-[#1565C0]" />
              <span className="text-sm font-semibold text-gray-700">Comprando para:</span>
            </div>
            <select
              value={selectedObraId}
              onChange={e => setSelectedObraId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1565C0] bg-white min-w-[200px] font-medium text-gray-800"
            >
              <option value="">Selecione uma obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.name}{o.city ? ` — ${o.city}` : ""}</option>
              ))}
            </select>
          </div>

          {/* Botao carrinho mobile */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-[#1565C0] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1251A3] transition-colors shrink-0 md:hidden"
          >
            <ShoppingCart size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#E53935] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Alerta: obra não selecionada */}
        {!selectedObraId && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Selecione uma obra para ver disponibilidade e adicionar itens ao carrinho.
            </p>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex gap-5">

        {/* === Sidebar categorias (desktop) === */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Categorias</p>
            <button
              onClick={() => { setSelectedCategory(""); setPage(1) }}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${!selectedCategory ? "bg-[#E3F2FD] text-[#1565C0] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            >
              Todos os itens
              <span className="ml-1 text-xs text-gray-400">({total})</span>
            </button>
            {categories.map(cat => (
              <button key={cat.id}
                onClick={() => { setSelectedCategory(cat.slug); setPage(1) }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${selectedCategory === cat.slug ? "bg-[#E3F2FD] text-[#1565C0] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {cat.name}
                <span className="ml-1 text-xs text-gray-400">({cat.count})</span>
              </button>
            ))}
          </div>
        </aside>

        {/* === Conteúdo principal === */}
        <div className="flex-1 min-w-0">
          {/* Busca + filtros */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="text-sm border border-gray-200 bg-white rounded-xl px-3 py-2.5 outline-none focus:border-[#1565C0] text-gray-700"
            >
              <option value="nome">A → Z</option>
              <option value="preco_asc">Menor preço</option>
              <option value="preco_desc">Maior preço</option>
            </select>
            <button
              className="lg:hidden flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2.5"
              onClick={() => setShowMobileFilters(v => !v)}
            >
              <SlidersHorizontal size={14} />
              Filtros
            </button>
          </div>

          {/* Filtros mobile por categoria (chips) */}
          {(showMobileFilters || true) && categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden scrollbar-hide">
              <button
                onClick={() => { setSelectedCategory(""); setPage(1) }}
                className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                  !selectedCategory ? "bg-[#1565C0] text-white border-[#1565C0]" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => { setSelectedCategory(cat.slug); setPage(1) }}
                  className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                    selectedCategory === cat.slug ? "bg-[#1565C0] text-white border-[#1565C0]" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Grid de itens — blur se sem obra */}
          <div className={`relative ${!selectedObraId ? "pointer-events-none" : ""}`}>
            {!selectedObraId && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center max-w-sm mx-4">
                  <Building2 size={36} className="text-[#1565C0] mx-auto mb-3" />
                  <p className="font-bold text-gray-800 mb-1">Selecione uma obra</p>
                  <p className="text-sm text-gray-500">Escolha a obra de destino no banner acima para ver disponibilidade e preços.</p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-52 animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Package size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum insumo encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Tente buscar por outro termo ou categoria</p>
              </div>
            ) : (
              <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 ${!selectedObraId ? "blur-sm" : ""}`}>
                {items.map(item => {
                  const inCart = isInCart(item.id)
                  const qty = quantities[item.id] ?? 1
                  return (
                    <div key={item.id}
                      className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all ${
                        inCart ? "border-[#1565C0] shadow-sm" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Imagem */}
                      <div className="h-28 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-gray-300">
                            <Package size={24} />
                            <span className="text-[9px] uppercase tracking-wide font-semibold">{item.category_name ?? "Insumo"}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1 gap-1.5">
                        {item.category_name && (
                          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">{item.category_name}</span>
                        )}
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{item.name}</p>

                        {/* Preço */}
                        {item.min_price_micros != null ? (
                          <p className="text-xs text-[#2E7D32] font-semibold">
                            {item.min_price_micros === item.max_price_micros
                              ? `${fmtBRL(item.avg_price_micros)}/${item.unit}`
                              : `${fmtBRL(item.min_price_micros)} – ${fmtBRL(item.max_price_micros)}/${item.unit}`
                            }
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">Sob consulta</p>
                        )}

                        {/* Qty + botão */}
                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                          {!inCart && (
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(1, (q[item.id] ?? 1) - 1) }))}
                                className="w-6 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="w-8 text-center text-xs font-medium text-gray-800">{qty}</span>
                              <button
                                onClick={() => setQuantities(q => ({ ...q, [item.id]: (q[item.id] ?? 1) + 1 }))}
                                className="w-6 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => inCart ? null : addToCart(item)}
                            disabled={addingId === item.id}
                            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                              inCart
                                ? "bg-[#E3F2FD] text-[#1565C0] cursor-default"
                                : "bg-[#1565C0] text-white hover:bg-[#1251A3]"
                            }`}
                          >
                            {addingId === item.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : inCart
                              ? "No carrinho"
                              : "Adicionar"
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                Próxima
              </button>
            </div>
          )}
        </div>

        {/* === Carrinho desktop sidebar 280px === */}
        <aside className="hidden md:flex flex-col w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col sticky top-[88px] max-h-[calc(100vh-100px)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-[#1565C0]" />
                <h2 className="font-bold text-gray-800 text-sm">Carrinho</h2>
                {cartCount > 0 && (
                  <span className="text-[10px] bg-[#1565C0] text-white font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShoppingCart size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Carrinho vazio</p>
                  <p className="text-xs text-gray-300 mt-1">Adicione insumos da vitrine</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        : <Package size={12} className="text-gray-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.unit}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.item_id)}
                      disabled={removingId === item.item_id}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {/* Qty inline */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => updateCartQty(item.item_id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs"
                      >
                        <Minus size={9} />
                      </button>
                      <span className="w-7 text-center text-xs font-medium text-gray-800">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.item_id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                    {item.avg_price_micros && (
                      <span className="text-xs font-semibold text-gray-700">
                        {fmtBRL(item.avg_price_micros * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-3 py-3 border-t border-gray-100 space-y-2">
                {cartTotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">Total estimado</span>
                    <span className="font-bold text-gray-900">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cartTotal)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => router.push("/dashboard/vitrine/checkout")}
                  disabled={!canCheckout}
                  className="w-full bg-[#1565C0] text-white font-bold py-2.5 rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  Finalizar compra
                  <ArrowRight size={14} />
                </button>
                {!selectedObraId && (
                  <p className="text-[10px] text-amber-600 text-center">Selecione uma obra para continuar</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* === Bottom sheet carrinho (mobile) === */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-md bg-white flex flex-col shadow-2xl rounded-t-2xl" style={{ marginTop: "auto" }}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">Carrinho</h2>
                <p className="text-xs text-gray-400">{cartCount} {cartCount === 1 ? "item" : "itens"}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-50">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 max-h-[60vh]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
                  <ShoppingCart size={32} className="text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">Carrinho vazio</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      : <Package size={16} className="text-gray-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} {item.unit}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.item_id)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  onClick={() => { setCartOpen(false); router.push("/dashboard/vitrine/checkout") }}
                  disabled={!canCheckout}
                  className="w-full bg-[#1565C0] text-white font-bold py-3 rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  Finalizar compra <ArrowRight size={15} />
                </button>
                {!selectedObraId && (
                  <p className="text-xs text-amber-600 text-center mt-2">Selecione uma obra para continuar</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB carrinho mobile (quando fechado) */}
      {!cartOpen && cart.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 md:hidden bg-[#1565C0] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-[#1251A3] transition-colors"
          aria-label="Abrir carrinho"
        >
          <ShoppingCart size={22} />
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-[#E53935] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {cartCount}
          </span>
        </button>
      )}
    </div>
  )
}
