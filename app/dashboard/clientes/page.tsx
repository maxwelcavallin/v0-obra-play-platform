"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, X, Users } from "lucide-react"
import { SkeletonList } from "@/components/ui/skeleton-list"
import { EmptyState } from "@/components/ui/empty-state"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"

interface Client {
  id: string
  type: "PF" | "PJ"
  full_name?: string
  fantasy_name?: string
  company_name?: string
  cpf?: string
  cnpj?: string
  whatsapp?: string
  status: string
}

function Highlight({ text, query }: { text?: string; query: string }) {
  if (!text) return null
  if (!query.trim()) return <>{text}</>
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const idx = normalize(text).indexOf(normalize(query.trim()))
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-[#212121] rounded-sm px-0.5">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  )
}

function ClientAvatar({ client }: { client: Client }) {
  const name = client.type === "PF" ? client.full_name : client.fantasy_name
  const initial = (name?.[0] ?? "C").toUpperCase()
  const color = client.type === "PF" ? "#1565C0" : "#FF9800"
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ backgroundColor: color }}>
      {initial}
    </div>
  )
}

export default function ClientesPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!activeCompany?.id) return
    setLoading(true)
    authFetch(`/api/clientes?company_id=${activeCompany.id}`)
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [activeCompany?.id])

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const filtered = useMemo(() => {
    const q = normalize(search.trim())
    const qDigits = q.replace(/\D/g, "")
    if (!q) return clients
    return clients.filter((c) => {
      const name = normalize(c.full_name ?? c.fantasy_name ?? c.company_name ?? "")
      const doc = (c.cpf ?? c.cnpj ?? "").replace(/\D/g, "")
      return name.includes(q) || (qDigits.length > 0 && doc.includes(qDigits))
    })
  }, [search, clients])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 relative flex-shrink-0" style={{ height: 52 }}>
        <span className="font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Clientes</span>
        <span className="ml-2 op-chip op-chip-neutral">{clients.length}</span>
      </div>

      {/* Barra de busca */}
      <div className="op-search-bar flex-shrink-0">
        <Search size={18} className="text-[#9E9E9E] flex-shrink-0" />
        <input
          className="op-search-input"
          placeholder="Buscar por nome ou documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Limpar busca">
            <X size={16} className="text-[#9E9E9E]" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 px-3 py-3 flex flex-col gap-2">
        {loading && <SkeletonList count={5} hasAvatar hasTag />}
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
            description={clients.length === 0 ? "Adicione seus clientes para gerenciar contratos e obras." : "Tente ajustar o filtro ou o texto da busca."}
            action={clients.length === 0 ? { label: "Novo cliente", onClick: () => router.push("/dashboard/clientes/novo") } : undefined}
          />
        )}
        {!loading && filtered.map((c) => {
          const name = c.type === "PF" ? c.full_name : c.fantasy_name
          const doc  = c.type === "PF" ? c.cpf : c.cnpj
          return (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
              className="bg-white rounded-lg shadow-sm flex items-center gap-3 px-3 py-3 text-left hover:bg-[#FAFAFA] transition-colors w-full"
            >
              <ClientAvatar client={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[#212121] truncate" style={{ fontSize: "0.875rem" }}>
                    <Highlight text={name} query={search} />
                  </span>
                  <span className={`op-chip text-xs ${c.type === "PF" ? "op-chip-primary" : "op-chip-warning"}`}>
                    {c.type}
                  </span>
                </div>
                <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.75rem", marginTop: 1 }}>
                  <Highlight text={doc} query={search} />
                </p>
                {c.whatsapp && (
                  <span className="text-[#757575]" style={{ fontSize: "0.7rem" }}>{c.whatsapp}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/dashboard/clientes/novo")}
        className="op-fab fixed bottom-6 right-4 z-20"
        aria-label="Novo cliente"
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  )
}
