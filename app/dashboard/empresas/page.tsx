"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"

interface Company {
  id: string
  fantasy_name: string
  company_name?: string
  cnpj?: string
  city?: string
  state?: string
  logo_url?: string
}

function CompanyAvatar({ company }: { company: Company }) {
  if (company.logo_url) {
    return (
      <img
        src={company.logo_url}
        alt={company.fantasy_name}
        className="w-12 h-12 rounded-full object-cover border border-[#E0E0E0]"
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-lg">{company.fantasy_name[0]}</span>
    </div>
  )
}

export default function EmpresasPage() {
  const router = useRouter()
  const { companies: ctxCompanies } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch("/api/empresas")
      .then((r) => r.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [ctxCompanies.length])

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 relative" style={{ height: 52 }}>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Minhas empresas
        </span>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loading && companies.length === 0 && (
          <div className="text-center py-12 text-[#9E9E9E]" style={{ fontSize: "0.875rem" }}>
            Nenhuma empresa cadastrada
          </div>
        )}
        {!loading && companies.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <CompanyAvatar company={c} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-[#212121]" style={{ fontSize: "0.9375rem" }}>
                  {c.fantasy_name}
                </span>
                {c.cnpj && (
                  <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.75rem", marginTop: 2 }}>{c.cnpj}</p>
                )}
                {(c.city || c.state) && (
                  <p className="text-[#757575]" style={{ fontSize: "0.75rem", marginTop: 1 }}>
                    {[c.city, c.state].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-[#EEEEEE] flex">
              <button
                onClick={() => router.push(`/dashboard/empresas/${c.id}/editar`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[#1565C0] font-medium hover:bg-[#E3F2FD] transition-colors"
                style={{ fontSize: "0.8125rem" }}
              >
                Editar
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/dashboard/empresas/nova")}
        className="op-fab fixed bottom-6 right-4 z-20"
        aria-label="Nova empresa"
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  )
}
