"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search, X, Building2, FileText, ShoppingCart, UserCircle, Store, HardHat } from "lucide-react"

type SearchResult = {
  type: "fornecedor" | "cotacao" | "oc" | "usuario"
  label: string
  sublabel?: string
  href: string
}

function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const ctrl = new AbortController()
    setLoading(true)
    fetch(`/api/admin/busca?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => { setResults(data.results ?? []); setLoading(false) })
      .catch(() => setLoading(false))
    return () => ctrl.abort()
  }, [query])

  return { results, loading }
}

const TYPE_META = {
  fornecedor: { label: "Empresa Fornecedora", icon: Building2, color: "text-[#FF9800]" },
  cotacao:    { label: "Cotação",              icon: FileText,   color: "text-[#1565C0]" },
  oc:         { label: "Ordem de Compra",      icon: ShoppingCart, color: "text-[#2E7D32]" },
  usuario:    { label: "Usuário Constructor",  icon: UserCircle, color: "text-[#7B1FA2]" },
}

export function AdminHeader({ breadcrumb, adminName }: { breadcrumb?: string; adminName: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { results, loading } = useGlobalSearch(query)

  const isFornecedor = pathname.startsWith("/admin/obraplay")
  const section = isFornecedor ? "fornecedor" : "constructor"

  function switchSection(target: "fornecedor" | "constructor") {
    if (target === section) return
    if (target === "fornecedor") router.push("/admin/obraplay/empresas")
    else router.push("/admin/constructor/usuarios")
  }

  // Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === "Escape") { setOpen(false); setQuery("") }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function goTo(href: string) {
    setOpen(false); setQuery("")
    router.push(href)
  }

  const grouped = ["fornecedor", "cotacao", "oc", "usuario"].reduce<Record<string, SearchResult[]>>((acc, t) => {
    const items = results.filter(r => r.type === t)
    if (items.length) acc[t] = items
    return acc
  }, {})

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        {breadcrumb && (
          <p className="text-sm text-gray-500 truncate">{breadcrumb}</p>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors bg-gray-50 min-w-[200px]"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[10px] bg-gray-100 border border-gray-200 rounded px-1 py-0.5 font-mono">⌘K</kbd>
        </button>

        {/* Modal de busca */}
        {open && (
          <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={() => { setOpen(false); setQuery("") }} />
            <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[560px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Digite um código de cotação, CNPJ, e-mail ou telefone..."
                  className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
                  autoComplete="off"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {loading && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">Buscando...</div>
                )}
                {!loading && query.length >= 2 && results.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">Nenhum resultado encontrado.</div>
                )}
                {!loading && query.length < 2 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    Digite ao menos 2 caracteres para buscar.
                  </div>
                )}
                {Object.entries(grouped).map(([type, items]) => {
                  const meta = TYPE_META[type as keyof typeof TYPE_META]
                  const Icon = meta.icon
                  return (
                    <div key={type}>
                      <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                        <p className={`text-[11px] font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</p>
                      </div>
                      {items.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Icon size={15} className={meta.color} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
                            {r.sublabel && <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Switcher de seção */}
      <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
        <button
          onClick={() => switchSection("fornecedor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            section === "fornecedor"
              ? "bg-white text-[#E65100] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Store size={12} />
          Fornecedor
        </button>
        <button
          onClick={() => switchSection("constructor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            section === "constructor"
              ? "bg-white text-[#1565C0] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <HardHat size={12} />
          Constructor
        </button>
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#0D1B3E] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">
          {adminName?.charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  )
}
