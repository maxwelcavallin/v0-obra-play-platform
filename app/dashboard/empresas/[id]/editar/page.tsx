"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { EmpresaForm } from "@/components/empresas/empresa-form"
import { MOCK_COMPANIES } from "@/lib/mock-data"
import { toast } from "sonner"

export default function EditarEmpresaPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)

  const company = MOCK_COMPANIES.find((c) => c.id === id)

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#757575]">Empresa não encontrada.</p>
      </div>
    )
  }

  async function handleSave() {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    toast.success("Dados salvos com sucesso!")
    router.push("/dashboard/empresas")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0" style={{ height: 52 }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Editar empresa
        </span>
      </div>
      <div className="flex-1 flex flex-col">
        <EmpresaForm initial={company} onSave={handleSave} loading={loading} />
      </div>
    </div>
  )
}
