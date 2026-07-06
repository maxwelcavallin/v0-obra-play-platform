"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { ShoppingCart, Search, Package, X, Plus, Minus, ChevronRight, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
}

export default function VitrinePage() {
  const { activeCompany } = useAuth()
  const router = useRouter()

  const [items, setItems] = useState<ShowcaseItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const PER = 24

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set("search", search)
      if (selectedCategory) params.set("category", selectedCategory)
      const res = await authFetch(`/api/vitrine/items?${params}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setCategories(data.categories ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedCategory])

  const fetchCart = useCallback(async () => {
    const res = await authFetch("/api/vitrine/carrinho")
    const data = await res.json()
    setCart(data.items ?? [])
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchCart() }, [fetchCart])

  async function addToCart(item: ShowcaseItem) {
    const qty = quantities[item.id] ?? 1
    setAddingId(item.id)
    try {
      await authFetch("/api/vitrine/carrinho", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id, quantity: qty }),
      })
      await fetchCart()
      toast.success(`${item.name} adicionado ao carrinho`)
    } catch {
      toast.error("Erro ao adicionar ao carrinho")
    } finally {
      setAddingId(null)
    }
  }

  async function removeFromCart(itemId: string) {
    await authFetch("/api/vitrine/carrinho", {
      method: "DELETE",
      body: JSON.stringify({ item_id: itemId }),
    })
    await fetchCart()
  }

  const isInCart = (itemId: string) => cart.some(c => c.item_id === itemId)
  const cartCount = cart.length
  const totalPages = Math.ceil(total / PER)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-[#212121]">Vitrine de Insumos</h1>
            <p className="text-xs text-[#757575]">Adicione itens ao carrinho e gere uma cotação</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-[#1565C0] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1251A3] transition-colors"
          >
            <ShoppingCart size={16} />
            Carrinho
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#E53935] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar de categorias */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[#EEEEEE] p-3">
            <p className="text-xs font-bold text-[#757575] uppercase tracking-wide mb-2 px-1">Categorias</p>
            <button
              onClick={() => { setSelectedCategory(""); setPage(1) }}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${!selectedCategory ? "bg-[#E3F2FD] text-[#1565C0] font-semibold" : "text-[#424242] hover:bg-[#F5F5F5]"}`}
            >
              Todos os itens
              <span className="ml-1 text-xs text-[#9E9E9E]">({total})</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.slug); setPage(1) }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${selectedCategory === cat.slug ? "bg-[#E3F2FD] text-[#1565C0] font-semibold" : "text-[#424242] hover:bg-[#F5F5F5]"}`}
              >
                {cat.name}
                <span className="ml-1 text-xs text-[#9E9E9E]">({cat.count})</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          {/* Barra de busca + filtro mobile */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#EEEEEE] rounded-xl text-sm text-[#212121] placeholder-[#9E9E9E] focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <button className="lg:hidden flex items-center gap-1.5 text-sm text-[#616161] bg-white border border-[#EEEEEE] rounded-xl px-3 py-2.5">
              <SlidersHorizontal size={14} />
              Filtros
            </button>
          </div>

          {/* Grid de itens */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#EEEEEE] h-52 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Package size={40} className="text-[#BDBDBD] mb-3" />
              <p className="text-[#616161] font-medium">Nenhum insumo encontrado</p>
              <p className="text-sm text-[#9E9E9E] mt-1">Tente buscar por outro termo ou categoria</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map(item => {
                  const inCart = isInCart(item.id)
                  const qty = quantities[item.id] ?? 1
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border transition-all flex flex-col overflow-hidden ${inCart ? "border-[#1565C0]" : "border-[#EEEEEE] hover:border-[#BDBDBD]"}`}
                    >
                      {/* Imagem */}
                      <div className="h-28 bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package size={28} className="text-[#BDBDBD]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1 gap-1.5">
                        {item.category_name && (
                          <span className="text-[9px] font-semibold text-[#9E9E9E] uppercase tracking-wide">{item.category_name}</span>
                        )}
                        <p className="text-xs font-bold text-[#212121] leading-tight line-clamp-2">{item.name}</p>

                        {/* Faixa de preço */}
                        {item.min_price_micros != null ? (
                          <p className="text-xs text-[#2E7D32] font-semibold">
                            {item.min_price_micros === item.max_price_micros
                              ? `${fmtBRL(item.avg_price_micros)}/${item.unit}`
                              : `${fmtBRL(item.min_price_micros)} – ${fmtBRL(item.max_price_micros)}/${item.unit}`
                            }
                          </p>
                        ) : (
                          <p className="text-xs text-[#9E9E9E]">Preço sob consulta</p>
                        )}

                        {/* Qty + botão */}
                        <div className="flex items-center gap-1.5 mt-auto pt-1">
                          {!inCart && (
                            <div className="flex items-center border border-[#EEEEEE] rounded-lg overflow-hidden">
                              <button
                                onClick={() => setQuantities(q => ({ ...q, [item.id]: Math.max(0.5, (q[item.id] ?? 1) - 1) }))}
                                className="w-6 h-7 flex items-center justify-center text-[#616161] hover:bg-[#F5F5F5]"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="w-8 text-center text-xs font-medium text-[#212121]">{qty}</span>
                              <button
                                onClick={() => setQuantities(q => ({ ...q, [item.id]: (q[item.id] ?? 1) + 1 }))}
                                className="w-6 h-7 flex items-center justify-center text-[#616161] hover:bg-[#F5F5F5]"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => inCart ? null : addToCart(item)}
                            disabled={addingId === item.id}
                            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${
                              inCart
                                ? "bg-[#E3F2FD] text-[#1565C0] cursor-default"
                                : "bg-[#1565C0] text-white hover:bg-[#1251A3]"
                            }`}
                          >
                            {inCart ? "No carrinho" : addingId === item.id ? "..." : "Adicionar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-[#EEEEEE] text-[#424242] disabled:opacity-40 hover:bg-[#F5F5F5]"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-[#757575]">Página {page} de {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-[#EEEEEE] text-[#424242] disabled:opacity-40 hover:bg-[#F5F5F5]"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawer do carrinho */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-md bg-white flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <div>
                <h2 className="font-bold text-[#212121]">Carrinho</h2>
                <p className="text-xs text-[#9E9E9E]">{cartCount} {cartCount === 1 ? "item" : "itens"}</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]">
                <X size={18} className="text-[#616161]" />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
                  <ShoppingCart size={36} className="text-[#BDBDBD] mb-3" />
                  <p className="text-[#757575] font-medium">Carrinho vazio</p>
                  <p className="text-xs text-[#9E9E9E] mt-1">Adicione insumos da vitrine</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-[#F8F9FA] rounded-xl p-3">
                  <div className="w-10 h-10 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      : <Package size={16} className="text-[#BDBDBD]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#212121] truncate">{item.name}</p>
                    <p className="text-xs text-[#9E9E9E]">{item.quantity} {item.unit}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.item_id)}
                    className="p-1 rounded-lg hover:bg-[#EEEEEE] text-[#BDBDBD] hover:text-[#F44336] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-[#EEEEEE]">
                <button
                  onClick={() => { setCartOpen(false); router.push("/dashboard/vitrine/checkout") }}
                  className="w-full bg-[#1565C0] text-white font-bold py-3 rounded-xl hover:bg-[#1251A3] transition-colors flex items-center justify-center gap-2"
                >
                  Gerar Cotação
                  <ChevronRight size={16} />
                </button>
                <p className="text-xs text-[#9E9E9E] text-center mt-2">
                  Uma cotação será criada com esses {cartCount} {cartCount === 1 ? "item" : "itens"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
