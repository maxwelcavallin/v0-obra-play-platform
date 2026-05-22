"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { EmpresaForm } from "@/components/empresas/empresa-form"
import { toast } from "sonner"

export default function NovaEmpresaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSave(data: Parameters<typeof EmpresaForm>[0]["onSave"] extends (d: infer D) => void ? D : never) {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    toast.success("Empresa criada com sucesso!")
    router.push("/dashboard/empresas")
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0" style={{ height: 52 }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Nova empresa
        </span>
      </div>
      <div className="flex-1 flex flex-col bg-white">
        <EmpresaForm onSave={handleSave} loading={loading} submitLabel="CRIAR EMPRESA" />
      </div>
    </div>
  )
}
