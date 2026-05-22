"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Instagram, Mail, Loader2 } from "lucide-react"
import { OpInput } from "@/components/ui/op-input"
import { fmtCPF, fmtCNPJ, fmtPhone, fmtCEP, fmtDate, type Client, type ClientType } from "@/lib/mock-data"
import { toast } from "sonner"

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

type FormData = Omit<Client, "id" | "companyId">

const EMPTY_PF: FormData = {
  type: "PF", fullName: "", cpf: "", birthDate: "",
  email: "", whatsapp: "", instagram: "",
  cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  notes: "",
}
const EMPTY_PJ: FormData = {
  type: "PJ", fantasyName: "", cnpj: "", companyName: "", responsibleName: "",
  email: "", whatsapp: "", instagram: "",
  cep: "", address: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  notes: "",
}

export default function NovoClientePage() {
  const router = useRouter()
  const [type, setType] = useState<ClientType>("PF")
  const [form, setForm] = useState<FormData>(EMPTY_PF)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  function switchType(t: ClientType) {
    setType(t)
    setForm(t === "PF" ? EMPTY_PF : EMPTY_PJ)
    setErrors({})
  }

  function update(key: keyof FormData, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  async function handleCnpjChange(raw: string) {
    const formatted = fmtCNPJ(raw)
    update("cnpj", formatted)
    const digits = formatted.replace(/\D/g, "")
    if (digits.length !== 14) return
    setCnpjLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setForm((p) => ({
        ...p,
        cnpj: formatted,
        companyName: json.razao_social ?? p.companyName,
        fantasyName: json.nome_fantasia || json.razao_social || p.fantasyName,
        // endereço
        cep: fmtCEP(json.cep?.replace(/\D/g, "") ?? ""),
        address: json.logradouro ?? p.address,
        number: json.numero ?? p.number,
        complement: json.complemento || p.complement,
        neighborhood: json.bairro ?? p.neighborhood,
        city: json.municipio ?? p.city,
        state: json.uf ?? p.state,
      }))
      toast.success("Dados do CNPJ preenchidos automaticamente")
    } catch {
      toast.error("CNPJ não encontrado na Receita Federal")
    } finally {
      setCnpjLoading(false)
    }
  }

  async function handleCepChange(raw: string) {
    const formatted = fmtCEP(raw)
    update("cep", formatted)
    const digits = formatted.replace(/\D/g, "")
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      if (json.erro) throw new Error()
      setForm((p) => ({
        ...p,
        address: json.logradouro ?? p.address,
        neighborhood: json.bairro ?? p.neighborhood,
        city: json.localidade ?? p.city,
        state: json.uf ?? p.state,
        complement: json.complemento || p.complement,
      }))
      toast.success("Endereço preenchido automaticamente")
    } catch {
      toast.error("CEP não encontrado")
    } finally {
      setCepLoading(false)
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (type === "PF") {
      if (!form.fullName?.trim()) e.fullName = "Nome obrigatório"
      if (!form.email?.trim()) e.email = "E-mail obrigatório"
      if (!form.whatsapp?.trim()) e.whatsapp = "WhatsApp obrigatório"
    } else {
      if (!form.fantasyName?.trim()) e.fantasyName = "Nome fantasia obrigatório"
      if (!form.email?.trim()) e.email = "E-mail obrigatório"
      if (!form.whatsapp?.trim()) e.whatsapp = "WhatsApp obrigatório"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    toast.success("Cliente criado com sucesso!")
    router.push("/dashboard/clientes")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0" style={{ height: 52 }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors" aria-label="Voltar">
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Novo cliente
        </span>
      </div>

      {/* Toggle PF / PJ */}
      <div className="flex bg-[#F5F5F5] mx-4 mt-4 rounded-lg p-1 flex-shrink-0">
        {(["PF", "PJ"] as ClientType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchType(t)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              type === t ? "bg-white text-[#1565C0] shadow-sm" : "text-[#757575]"
            }`}
          >
            {t === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
          </button>
        ))}
      </div>

      {/* Formulário */}
      <form id="cliente-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto" style={{ padding: "16px 16px 0" }}>
        {type === "PF" ? (
          <div className="flex flex-col gap-1">
            <OpInput label="CPF" value={form.cpf ?? ""} onChange={(e) => update("cpf", fmtCPF(e.target.value))} placeholder="000.000.000-00" />
            <OpInput label="Nome completo*" value={form.fullName ?? ""} onChange={(e) => update("fullName", e.target.value)} placeholder="Nome e sobrenome" error={errors.fullName} />
            <OpInput label="Data de nascimento" value={form.birthDate ?? ""} onChange={(e) => update("birthDate", fmtDate(e.target.value))} placeholder="DD/MM/AAAA" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <OpInput
              label="CNPJ"
              value={form.cnpj ?? ""}
              onChange={(e) => handleCnpjChange(e.target.value)}
              placeholder="00.000.000/0000-00"
              suffix={cnpjLoading ? <Loader2 size={15} className="animate-spin text-[#1565C0]" /> : undefined}
            />
            <OpInput label="Razão social" value={form.companyName ?? ""} onChange={(e) => update("companyName", e.target.value)} placeholder="Preenchido automaticamente pelo CNPJ" />
            <OpInput label="Nome fantasia*" value={form.fantasyName ?? ""} onChange={(e) => update("fantasyName", e.target.value)} placeholder="Como a empresa é conhecida" error={errors.fantasyName} />
            <OpInput label="Nome do responsável" value={form.responsibleName ?? ""} onChange={(e) => update("responsibleName", e.target.value)} placeholder="Nome completo" />
          </div>
        )}

        {/* Contato — comum a PF e PJ */}
        <div className="flex flex-col gap-1 mt-3">
          <p className="text-[#9E9E9E] font-medium" style={{ fontSize: "0.75rem", marginBottom: 4 }}>CONTATO</p>
          <OpInput label="E-mail*" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@exemplo.com" error={errors.email} suffix={<Mail size={15} className="text-[#9E9E9E]" />} />
          <OpInput label="WhatsApp*" value={form.whatsapp} onChange={(e) => update("whatsapp", fmtPhone(e.target.value))} placeholder="(00) 00000-0000" error={errors.whatsapp} suffix={<span style={{ fontSize: "0.7rem", color: "#25D366", fontWeight: 700 }}>WA</span>} />
          <OpInput label="Instagram" value={form.instagram} onChange={(e) => update("instagram", e.target.value.replace(/^@/, ""))} placeholder="@perfil" prefix={<span className="text-[#9E9E9E] pr-1" style={{ fontSize: "1rem" }}>@</span>} suffix={<Instagram size={15} className="text-[#9E9E9E]" />} />
        </div>

        {/* Endereço */}
        <div className="flex flex-col gap-1 mt-3">
          <p className="text-[#9E9E9E] font-medium" style={{ fontSize: "0.75rem", marginBottom: 4 }}>ENDEREÇO</p>
          <OpInput
            label="CEP"
            value={form.cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            suffix={cepLoading ? <Loader2 size={15} className="animate-spin text-[#1565C0]" /> : undefined}
          />
          <OpInput label="Logradouro" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua, Avenida..." />
          <div className="flex gap-4">
            <div className="flex-1"><OpInput label="Número" value={form.number} onChange={(e) => update("number", e.target.value)} placeholder="Nº" /></div>
            <div className="flex-1"><OpInput label="Complemento" value={form.complement} onChange={(e) => update("complement", e.target.value)} placeholder="Apto, Sala..." /></div>
          </div>
          <OpInput label="Bairro" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="Bairro" />
          <OpInput label="Cidade" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Cidade" />
          <div>
            <label className="text-[#9E9E9E] block" style={{ fontSize: "0.75rem", marginBottom: 2 }}>Estado</label>
            <select value={form.state} onChange={(e) => update("state", e.target.value)} className="op-input-underline" style={{ appearance: "none" }}>
              <option value="">Selecione</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Observações */}
        <div className="mt-3 mb-2">
          <p className="text-[#9E9E9E] font-medium mb-2" style={{ fontSize: "0.75rem" }}>OBSERVAÇÕES</p>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Anotações sobre o cliente..."
            rows={3}
            className="w-full border border-[#E0E0E0] rounded-lg resize-none outline-none text-[#212121] placeholder:text-[#9E9E9E] transition-colors focus:border-[#1565C0]"
            style={{ fontSize: "0.875rem", padding: "10px 12px" }}
          />
        </div>
      </form>

      {/* Botao fixo */}
      <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE]" style={{ padding: "12px 16px 20px" }}>
        <button type="submit" form="cliente-form" disabled={loading} className="op-btn-primary">
          {loading ? "Salvando..." : "SALVAR CLIENTE"}
        </button>
      </div>
    </div>
  )
}
