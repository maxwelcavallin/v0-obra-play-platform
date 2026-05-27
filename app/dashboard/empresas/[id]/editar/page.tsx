"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { EmpresaForm } from "@/components/empresas/empresa-form"
import { toast } from "sonner"
import { authFetch } from "@/lib/auth-fetch"

export default function EditarEmpresaPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [initial, setInitial] = useState<any>(null)

  useEffect(() => {
    authFetch(`/api/empresas/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setInitial({
            fantasyName: data.fantasy_name ?? "",
            companyName: data.company_name ?? "",
            cnpj: data.cnpj ?? "",
            logoUrl: data.logo_url,
            cep: data.zipcode ?? "",
            address: data.street ?? "",
            number: data.number ?? "",
            complement: data.complement ?? "",
            neighborhood: data.neighbourhood ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            whatsapp: data.whatsapp ?? "",
            email: data.email ?? "",
            instagram: data.instagram ?? "",
            website: data.website ?? "",
            obraplay_company_id: data.obraplay_company_id != null ? String(data.obraplay_company_id) : "",
          })
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [id])

  async function handleSave(data: any) {
    setLoading(true)
    try {
      const res = await authFetch(`/api/empresas/${id}`, {
        method: "PUT",
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
          obraplay_company_id: data.obraplay_company_id ? parseInt(data.obraplay_company_id, 10) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao salvar")
      toast.success("Dados salvos com sucesso!")
      router.push("/dashboard/empresas")
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar empresa")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1565C0]" />
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#757575]">Empresa não encontrada.</p>
      </div>
    )
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
        <EmpresaForm initial={initial} onSave={handleSave} loading={loading} showObraPlayId />
      </div>
    </div>
  )
}
