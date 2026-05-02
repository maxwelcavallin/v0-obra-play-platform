"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Globe,
  Loader2,
  Check,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { OpInput } from "@/components/ui/op-input"
import { OpAvatarUpload } from "@/components/ui/op-avatar-upload"

const ESTADOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}

type Tab = "geral" | "endereco" | "contato"

export default function EmpresaPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [logo, setLogo] = useState<string | undefined>(activeCompany?.logoUrl)
  const [tab, setTab] = useState<Tab>("geral")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Geral
  const [fantasyName, setFantasyName] = useState(activeCompany?.fantasyName ?? "")
  const [companyName, setCompanyName] = useState(activeCompany?.companyName ?? "")
  const [cnpj, setCnpj] = useState(activeCompany?.cnpj ?? "")
  const [segment, setSegment] = useState("")
  const [website, setWebsite] = useState("")
  const [description, setDescription] = useState("")

  // Endereco
  const [cep, setCep] = useState("")
  const [street, setStreet] = useState("")
  const [number, setNumber] = useState("")
  const [complement, setComplement] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [city, setCity] = useState(activeCompany?.city ?? "")
  const [state, setState] = useState(activeCompany?.state ?? "PR")

  // Contato
  const [contactPhone, setContactPhone] = useState("")
  const [contactPhone2, setContactPhone2] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactWhatsapp, setContactWhatsapp] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})

  const logoInitials = (fantasyName || "E").slice(0, 2).toUpperCase()

  async function handleSave() {
    const errs: Record<string, string> = {}
    if (!fantasyName.trim()) errs.fantasyName = "Nome fantasia obrigatório"
    if (!cnpj.replace(/\D/g, "") || cnpj.replace(/\D/g, "").length < 14) errs.cnpj = "CNPJ inválido"
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    await new Promise((r) => setTimeout(r, 900))
    setSaving(false)
    setSaved(true)
    toast.success("Empresa atualizada com sucesso")
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "geral",    label: "Geral",    icon: <Building2 size={15} /> },
    { key: "endereco", label: "Endereço", icon: <MapPin size={15} /> },
    { key: "contato",  label: "Contato",  icon: <Phone size={15} /> },
  ]

  return (
    <div className="min-h-dvh bg-white flex flex-col">

      {/* Sub-header */}
      <header className="op-subheader border-b border-[#EEEEEE]">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="op-subheader-title">Minha empresa</span>
      </header>

      {/* Logo da empresa */}
      <div className="bg-white border-b border-[#EEEEEE] flex flex-col items-center py-5 gap-2">
        <OpAvatarUpload
          src={logo}
          initials={logoInitials}
          size={84}
          shape="rounded"
          onChange={setLogo}
          label="Alterar logo"
        />
        <p className="font-semibold text-[#212121]" style={{ fontSize: "1rem" }}>
          {fantasyName || activeCompany?.fantasyName || "Empresa"}
        </p>
        {activeCompany?.cnpj && (
          <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>
            CNPJ: {activeCompany.cnpj}
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#EEEEEE] bg-white sticky top-0 z-10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-b-2 ${
              tab === t.key
                ? "border-[#1565C0] text-[#1565C0]"
                : "border-transparent text-[#757575] hover:text-[#424242]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteudo scrollavel */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 96px" }}>
        <form
          id="empresa-form"
          noValidate
          onSubmit={(e) => { e.preventDefault(); handleSave() }}
          className="flex flex-col gap-1"
        >

          {/* ── Geral ── */}
          {tab === "geral" && (
            <>
              <OpInput
                label="Nome fantasia*"
                value={fantasyName}
                onChange={(e) => { setFantasyName(e.target.value); setErrors((p) => ({ ...p, fantasyName: "" })) }}
                placeholder="Nome pelo qual a empresa é conhecida"
                error={errors.fantasyName}
              />
              <OpInput
                label="Razão social"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Razão social completa"
              />
              <OpInput
                label="CNPJ*"
                value={cnpj}
                onChange={(e) => { setCnpj(formatCNPJ(e.target.value)); setErrors((p) => ({ ...p, cnpj: "" })) }}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                error={errors.cnpj}
              />
              <OpInput
                label="Segmento"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex: Construção civil, Materiais de construção"
              />
              <OpInput
                label="Site / URL"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
                suffix={<Globe size={16} className="text-[#9E9E9E]" />}
              />
              <div className="flex flex-col w-full mt-2">
                <label className="text-[#9E9E9E]" style={{ fontSize: "0.75rem", marginBottom: 4 }}>
                  Descricao da empresa
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva brevemente sua empresa..."
                  rows={4}
                  className="w-full border border-[#E0E0E0] rounded-md p-3 text-[#212121] placeholder:text-[#9E9E9E] outline-none focus:border-[#1565C0] transition-colors resize-none font-[inherit]"
                  style={{ fontSize: "1rem" }}
                />
              </div>

              <div className="op-info-box mt-3">
                <Info size={14} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
                <span>As informacoes da empresa sao exibidas no seu perfil institucional para fornecedores e parceiros.</span>
              </div>
            </>
          )}

          {/* ── Endereco ── */}
          {tab === "endereco" && (
            <>
              <OpInput
                label="CEP"
                value={cep}
                onChange={(e) => setCep(formatCEP(e.target.value))}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <OpInput
                label="Logradouro"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua, Avenida, etc."
              />
              <div className="flex gap-3">
                <div className="w-28 flex-shrink-0">
                  <OpInput
                    label="Numero"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Nº"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex-1">
                  <OpInput
                    label="Complemento"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Sala, Andar, Bloco"
                  />
                </div>
              </div>
              <OpInput
                label="Bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Nome do bairro"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <OpInput
                    label="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="w-28 flex-shrink-0 flex flex-col">
                  <label className="text-[#9E9E9E]" style={{ fontSize: "0.75rem", marginBottom: 2 }}>
                    Estado
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="bg-transparent border-b border-[#E0E0E0] focus:border-[#1565C0] outline-none text-[#212121] font-[inherit] cursor-pointer"
                    style={{ fontSize: "1rem", paddingTop: 16, paddingBottom: 8 }}
                  >
                    {ESTADOS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Contato ── */}
          {tab === "contato" && (
            <>
              <OpInput
                label="Telefone principal"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                suffix={<Phone size={16} className="text-[#9E9E9E]" />}
              />
              <OpInput
                label="Telefone secundario"
                type="tel"
                value={contactPhone2}
                onChange={(e) => setContactPhone2(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
              <OpInput
                label="E-mail de contato"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contato@empresa.com"
                suffix={<Mail size={16} className="text-[#9E9E9E]" />}
              />
              <OpInput
                label="WhatsApp"
                type="tel"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                suffix={
                  <span style={{ fontSize: "0.75rem", color: "#25D366", fontWeight: 600 }}>WA</span>
                }
              />

              <div className="op-info-box mt-3">
                <Info size={14} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
                <span>Essas informacoes de contato sao utilizadas pelos fornecedores para entrar em contato com sua empresa.</span>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Botao fixo */}
      <div
        className="flex-shrink-0 border-t border-[#EEEEEE] bg-white"
        style={{ padding: "16px 16px 20px" }}
      >
        <button
          form="empresa-form"
          type="submit"
          className="op-btn-primary"
          disabled={saving}
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" /> Salvando...</>
          ) : saved ? (
            <><Check size={15} /> Salvo!</>
          ) : (
            "SALVAR ALTERACOES"
          )}
        </button>
      </div>
    </div>
  )
}
