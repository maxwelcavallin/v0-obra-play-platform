"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, X } from "lucide-react"
import { MOCK_CLIENTS, type Client } from "@/lib/mock-data"

function ClientAvatar({ client }: { client: Client }) {
  const name = client.type === "PF" ? client.fullName : client.fantasyName
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
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return MOCK_CLIENTS
    return MOCK_CLIENTS.filter((c) => {
      const name = (c.fullName ?? c.fantasyName ?? "").toLowerCase()
      const doc = (c.cpf ?? c.cnpj ?? "").replace(/\D/g, "")
      return name.includes(q) || doc.includes(q.replace(/\D/g, ""))
    })
  }, [search])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 relative flex-shrink-0" style={{ height: 52 }}>
        <span className="font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Clientes</span>
        <span className="ml-2 op-chip op-chip-neutral">{MOCK_CLIENTS.length}</span>
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#9E9E9E]" style={{ fontSize: "0.875rem" }}>
            Nenhum cliente encontrado
          </div>
        )}
        {filtered.map((c) => {
          const name = c.type === "PF" ? c.fullName : c.fantasyName
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
                  <span className="font-medium text-[#212121] truncate" style={{ fontSize: "0.875rem" }}>{name}</span>
                  <span className={`op-chip text-xs ${c.type === "PF" ? "op-chip-primary" : "op-chip-warning"}`}>
                    {c.type}
                  </span>
                </div>
                <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.75rem", marginTop: 1 }}>{doc}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {c.whatsapp && <span className="text-[#757575]" style={{ fontSize: "0.7rem" }}>{c.whatsapp}</span>}
                  {c.lastWork && (
                    <span className="text-[#9E9E9E] truncate" style={{ fontSize: "0.7rem" }}>
                      Última obra: {c.lastWork}
                    </span>
                  )}
                </div>
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
