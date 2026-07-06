"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, ToggleLeft, ToggleRight, Package, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface ShowcaseItem {
  id: string
  name: string
  unit: string
  category_name?: string
  min_price_micros?: number
  max_price_micros?: number
  is_active: boolean
  last_synced_at?: string
}

function fmtBRL(micros?: number | null) {
  if (micros == null) return "—"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(micros / 1_000_000)
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AdminVitrinePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [syncResult, setSyncResult] = useState<{ total_synced: number; ts: string } | null>(null)
  const PER = 50

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/vitrine/items?${params}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/vitrine/sync", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setSyncResult({ total_synced: data.total_synced, ts: new Date().toLocaleTimeString("pt-BR") })
      toast.success(`Sync concluído — ${data.total_synced} itens atualizados`)
      fetchItems()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no sync")
    } finally {
      setSyncing(false)
    }
  }

  async function toggleActive(item: ShowcaseItem) {
    await fetch("/api/admin/vitrine/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  const totalPages = Math.ceil(total / PER)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Vitrine de Insumos</h1>
          <p className="text-sm text-[#757575] mt-0.5">{total} itens cadastrados</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#1565C0] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar ObraPlay"}
        </button>
      </div>

      {syncResult && (
        <div className="flex items-center gap-2 bg-[#E8F5E9] text-[#2E7D32] text-sm px-4 py-2.5 rounded-xl">
          <CheckCircle2 size={15} />
          <span>Último sync: {syncResult.total_synced} itens atualizados às {syncResult.ts}</span>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
        <input
          type="text"
          placeholder="Buscar itens..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 border border-[#EEEEEE] rounded-xl text-sm text-[#212121] placeholder-[#9E9E9E] focus:outline-none focus:border-[#1565C0] bg-white"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F5F5F5]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide hidden sm:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide hidden md:table-cell">Faixa de preço</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide hidden lg:table-cell">Último sync</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[#9E9E9E] uppercase tracking-wide">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {[1,2,3,4,5].map(j => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F5F5F5] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Package size={32} className="text-[#BDBDBD] mx-auto mb-2" />
                  <p className="text-sm text-[#9E9E9E]">
                    {search ? "Nenhum item encontrado" : "Nenhum item. Clique em Sincronizar ObraPlay para importar."}
                  </p>
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#212121]">{item.name}</p>
                    <p className="text-xs text-[#9E9E9E]">{item.unit}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#616161] hidden sm:table-cell">{item.category_name ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {item.min_price_micros != null ? (
                    <span className="text-[#2E7D32] font-medium">
                      {fmtBRL(item.min_price_micros)} – {fmtBRL(item.max_price_micros)}
                    </span>
                  ) : (
                    <span className="text-[#BDBDBD]">Sem preço</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#9E9E9E] text-xs hidden lg:table-cell">{fmtDate(item.last_synced_at)}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(item)} className="text-[#9E9E9E] hover:text-[#1565C0] transition-colors">
                    {item.is_active
                      ? <ToggleRight size={22} className="text-[#1565C0]" />
                      : <ToggleLeft size={22} />
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5F5F5]">
            <p className="text-xs text-[#9E9E9E]">
              {((page - 1) * PER) + 1}–{Math.min(page * PER, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1.5 border border-[#EEEEEE] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F5]">
                Anterior
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1.5 border border-[#EEEEEE] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F5]">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
