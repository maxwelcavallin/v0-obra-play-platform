"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight, Building2 } from "lucide-react"
import { MOCK_COMPANIES, type CompanyMock } from "@/lib/mock-data"

function CompanyAvatar({ company }: { company: CompanyMock }) {
  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt={company.fantasyName}
        className="w-12 h-12 rounded-full object-cover border border-[#E0E0E0]"
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-lg">{company.fantasyName[0]}</span>
    </div>
  )
}

export default function EmpresasPage() {
  const router = useRouter()
  const [companies] = useState<CompanyMock[]>(MOCK_COMPANIES)

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 relative" style={{ height: 52 }}>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Minhas empresas
        </span>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        {companies.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3">
              <CompanyAvatar company={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#212121]" style={{ fontSize: "0.9375rem" }}>
                    {c.fantasyName}
                  </span>
                  <span
                    className={`op-chip text-xs font-medium ${c.role === "Admin" ? "op-chip-primary" : "op-chip-neutral"}`}
                  >
                    {c.role}
                  </span>
                </div>
                <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                  {c.cnpj}
                </p>
                <p className="text-[#757575]" style={{ fontSize: "0.75rem", marginTop: 1 }}>
                  {c.city} · {c.state}
                </p>
              </div>
            </div>
            <div className="border-t border-[#EEEEEE] flex">
              <button
                onClick={() => router.push(`/dashboard/empresas/${c.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[#1565C0] font-medium hover:bg-[#E3F2FD] transition-colors"
                style={{ fontSize: "0.8125rem" }}
              >
                Acessar
                <ChevronRight size={14} />
              </button>
              <div className="w-px bg-[#EEEEEE]" />
              <button
                onClick={() => router.push(`/dashboard/empresas/${c.id}/editar`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[#757575] font-medium hover:bg-[#F5F5F5] transition-colors"
                style={{ fontSize: "0.8125rem" }}
              >
                Editar
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
