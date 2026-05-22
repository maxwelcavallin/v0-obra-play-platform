"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { EmpresaForm } from "@/components/empresas/empresa-form"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

export default function NovaEmpresaPage() {
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleSave(data: any) {
    setLoading(true)
    try {
      const res = await authFetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fantasy_name: data.fantasyName,
          company_name: data.companyName,
          cnpj: data.cnpj,
          logo_url: data.logoUrl,
          zipcode: data.cep,
          street: data.address,
          number: data.number,
          complement: data.complement,
          neighbourhood: data.neighborhood,
          city: data.city,
          state: data.state,
          whatsapp: data.whatsapp,
          email: data.email,
          instagram: data.instagram,
          website: data.website,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao criar empresa")

      // Atualiza contexto com a nova empresa
      await completeOnboarding({
        id: json.id,
        fantasyName: json.fantasy_name,
        companyName: json.company_name ?? "",
        cnpj: json.cnpj ?? "",
        city: json.city ?? "",
        state: json.state ?? "",
        logoUrl: json.logo_url,
      })

      toast.success("Empresa criada com sucesso!")
      router.push("/dashboard/empresas")
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar empresa")
    } finally {
      setLoading(false)
    }
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
