"use client"

import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Phone, Mail, MapPin, FileText, Instagram, Pencil } from "lucide-react"
import { MOCK_CLIENTS } from "@/lib/mock-data"

// Mock obras vinculadas ao cliente
const MOCK_OBRAS: Record<string, { id: string; name: string; status: string; date: string }[]> = {
  "cli-001": [
    { id: "ob1", name: "Reforma Residencial", status: "Concluída", date: "Ago/2024" },
    { id: "ob2", name: "Pintura Interna",     status: "Concluída", date: "Jan/2023" },
  ],
  "cli-002": [
    { id: "ob3", name: "Instalação Elétrica",  status: "Concluída", date: "Mai/2024" },
    { id: "ob4", name: "Reforma Completa",     status: "Em andamento", date: "Início Jan/2025" },
  ],
  "cli-003": [
    { id: "ob5", name: "Construção Residencial", status: "Concluída", date: "Dez/2023" },
  ],
  "cli-004": [
    { id: "ob6", name: "Ampliação Clínica",    status: "Concluída", date: "Nov/2024" },
  ],
}

const STATUS_CLASS: Record<string, string> = {
  "Concluída":      "op-chip-success",
  "Em andamento":   "op-chip-warning",
  "Pausada":        "op-chip-neutral",
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#EEEEEE] last:border-0">
      <div className="text-[#9E9E9E] mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[#9E9E9E]" style={{ fontSize: "0.7rem" }}>{label}</p>
        <p className="text-[#212121] break-words" style={{ fontSize: "0.875rem" }}>{value}</p>
      </div>
    </div>
  )
}

export default function ClienteDetalhePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const client = MOCK_CLIENTS.find((c) => c.id === id)
  const obras = MOCK_OBRAS[id] ?? []

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <p className="text-[#757575]">Cliente não encontrado.</p>
      </div>
    )
  }

  const name = client.type === "PF" ? client.fullName : client.fantasyName
  const doc  = client.type === "PF" ? client.cpf : client.cnpj
  const initial = (name?.[0] ?? "C").toUpperCase()
  const avatarColor = client.type === "PF" ? "#1565C0" : "#FF9800"
  const fullAddress = [client.address, client.number, client.complement, client.neighborhood, client.city, client.state]
    .filter(Boolean).join(", ")

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Header azul com avatar */}
      <div className="bg-[#1565C0] flex flex-col items-center pt-3 pb-5 px-4 relative">
        <div className="w-full flex items-center justify-between mb-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Voltar">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <button onClick={() => router.push(`/dashboard/clientes/${id}/editar`)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Editar">
            <Pencil size={18} className="text-white" />
          </button>
        </div>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30" style={{ backgroundColor: avatarColor }}>
          {initial}
        </div>
        <h1 className="text-white font-semibold mt-2 text-center" style={{ fontSize: "1.0625rem" }}>{name}</h1>
        <span className={`op-chip mt-1 ${client.type === "PF" ? "bg-white/20 text-white" : "bg-white/20 text-white"}`}>
          {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
        </span>
      </div>

      <div className="flex-1 px-3 py-3 flex flex-col gap-3">

        {/* Dados principais */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden px-3">
          <InfoRow icon={<FileText size={16} />} label="Documento" value={doc} />
          {client.type === "PF" && (
            <InfoRow icon={<FileText size={16} />} label="Data de nascimento" value={client.birthDate} />
          )}
          {client.type === "PJ" && (
            <>
              <InfoRow icon={<FileText size={16} />} label="Razão social" value={client.companyName} />
              <InfoRow icon={<FileText size={16} />} label="Responsável" value={client.responsibleName} />
            </>
          )}
        </div>

        {/* Contato */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden px-3">
          <p className="text-[#9E9E9E] font-medium py-2.5 border-b border-[#EEEEEE]" style={{ fontSize: "0.75rem" }}>CONTATO</p>
          <InfoRow icon={<Mail size={16} />} label="E-mail" value={client.email} />
          <InfoRow icon={<Phone size={16} />} label="WhatsApp" value={client.whatsapp} />
          <InfoRow icon={<Instagram size={16} />} label="Instagram" value={client.instagram ? `@${client.instagram.replace(/^@/, "")}` : undefined} />
        </div>

        {/* Endereço */}
        {fullAddress && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden px-3">
            <InfoRow icon={<MapPin size={16} />} label="Endereço" value={fullAddress} />
          </div>
        )}

        {/* Obras vinculadas */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EEEEEE]">
            <p className="text-[#9E9E9E] font-medium" style={{ fontSize: "0.75rem" }}>OBRAS VINCULADAS</p>
            <span className="op-chip op-chip-neutral">{obras.length}</span>
          </div>
          {obras.length === 0 ? (
            <p className="text-center text-[#9E9E9E] py-6" style={{ fontSize: "0.875rem" }}>Nenhuma obra vinculada</p>
          ) : (
            obras.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-3 py-3 border-b border-[#EEEEEE] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#212121] truncate" style={{ fontSize: "0.875rem" }}>{o.name}</p>
                  <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>{o.date}</p>
                </div>
                <span className={`op-chip text-xs ${STATUS_CLASS[o.status] ?? "op-chip-neutral"}`}>{o.status}</span>
              </div>
            ))
          )}
        </div>

        {/* Observações */}
        {client.notes && (
          <div className="bg-white rounded-lg shadow-sm px-3 py-3">
            <p className="text-[#9E9E9E] font-medium mb-2" style={{ fontSize: "0.75rem" }}>OBSERVAÇÕES</p>
            <p className="text-[#424242] leading-relaxed" style={{ fontSize: "0.875rem" }}>{client.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
