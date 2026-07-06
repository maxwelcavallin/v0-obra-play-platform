"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star, CheckCircle2, XCircle } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

// Dados mockados para o detalhe
const MOCK_EMPRESA = {
  id: "1",
  full_name: "Depósito Central Materiais",
  cnpj: "12.345.678/0001-90",
  city: "São Paulo", state: "SP",
  email: "contato@depositocentral.com.br",
  phone: "(11) 3456-7890",
  whatsapp: "(11) 9 9876-5432",
  street: "Av. Paulista", number: "1000",
  neighbourhood: "Bela Vista", zipcode: "01310-100",
  verified_cnpj: true, has_confirmed_address: true,
  has_confirmed_configuration: true, has_active_institutional_page: true,
  has_autofill_enabled: false, base_freight_micros: 0,
  operation_types: ["Materiais de construção", "Cimento", "Areia"],
  metrics: { received: 284, answered: 201, response_rate: 70.8, orders: 87, avg_ticket: 4250000, avg_response_time_minutes: 220 },
  membros: [
    { name: "Carlos Oliveira", email: "carlos@depositocentral.com.br", role: "owner", status: "ativo", joined: "2024-03-15" },
    { name: "Ana Lima", email: "ana@depositocentral.com.br", role: "member", status: "ativo", joined: "2024-04-01" },
  ],
  cotacoes: [
    { code: "UHUTQJG", buyer: "Construtora ABC", date: "2026-06-20", status: "respondida", total: 8200000, autofilled: false },
    { code: "3SQME6Y", buyer: "Obras e Cia", date: "2026-06-15", status: "convertida", total: 12400000, autofilled: true },
  ],
  avaliacoes: [
    { nota: 5, comentario: "Entrega rápida e produto de qualidade.", date: "2026-06-10", oc: "OC-ZMSDNDL" },
    { nota: 4, comentario: "Boa comunicação, embalagem poderia melhorar.", date: "2026-05-28", oc: "OC-ABCDEFG" },
  ],
  vitrine: [
    { name: "Cimento CP-II 50kg", unit: "Saca", price: 37000000, disponivel: true },
    { name: "Areia média lavada", unit: "m³", price: 110000000, disponivel: true },
    { name: "Bloco cerâmico 14x19x29", unit: "Milheiro", price: 1850000000, disponivel: false },
  ],
}

const TABS = ["Dados cadastrais", "Membros", "Cotações respondidas", "Ordens de Compra", "Avaliações", "Vitrine", "Documentos"]

export default function EmpresaFornecedoraDetalhe() {
  const [tab, setTab] = useState("Dados cadastrais")
  const e = MOCK_EMPRESA

  function MetricCard({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Voltar */}
      <Link href="/admin/obraplay/empresas" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Empresas Fornecedoras
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 shrink-0">
              {e.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{e.full_name}</h1>
                {e.verified_cnpj && <Badge color="green">CNPJ verificado</Badge>}
                {e.has_confirmed_address && <Badge color="blue">Endereço confirmado</Badge>}
                {e.has_confirmed_configuration && <Badge color="blue">Config confirmada</Badge>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{e.cnpj} · {e.city}, {e.state}</p>
              <p className="text-sm text-gray-500">{e.email} · {e.phone}</p>
            </div>
          </div>
          <ReadonlyBadge />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <MetricCard label="Cotações recebidas" value={e.metrics.received} />
        <MetricCard label="Respondidas" value={e.metrics.answered} />
        <MetricCard label="Taxa de resposta" value={`${e.metrics.response_rate}%`} />
        <MetricCard label="Ordens de Compra" value={e.metrics.orders} />
        <MetricCard label="Ticket médio" value={fmtBRL(e.metrics.avg_ticket)} />
        <MetricCard label="Tempo médio resp." value={`${Math.round(e.metrics.avg_response_time_minutes / 60)}h`} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "Dados cadastrais" && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{e.street}, {e.number}</p>
                  <p className="text-gray-700">{e.neighbourhood} · CEP {e.zipcode}</p>
                  <p className="text-gray-700">{e.city} — {e.state}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contato</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{e.email}</p>
                  <p className="text-gray-700">{e.phone}</p>
                  {e.whatsapp && <p className="text-gray-700">WhatsApp: {e.whatsapp}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Operações</h3>
                <div className="flex flex-wrap gap-1.5">
                  {e.operation_types.map(op => <Badge key={op} color="blue">{op}</Badge>)}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Configurações</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["CNPJ verificado", e.verified_cnpj],
                    ["Endereço confirmado", e.has_confirmed_address],
                    ["Config confirmada", e.has_confirmed_configuration],
                    ["Vitrine ativa", e.has_active_institutional_page],
                    ["Autofill ativo", e.has_autofill_enabled],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="flex items-center gap-2">
                      {val ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-300" />}
                      <span className="text-gray-700">{String(label)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "Membros" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Nome", "E-mail", "Papel", "Status", "Entrada"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {e.membros.map((m, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{m.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{m.email}</td>
                    <td className="py-3 pr-4"><Badge color="blue">{m.role}</Badge></td>
                    <td className="py-3 pr-4"><Badge color="green">{m.status}</Badge></td>
                    <td className="py-3 text-gray-500">{fmtDate(m.joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Cotações respondidas" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Código", "Comprador", "Data", "Status", "Valor total", "Tipo"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {e.cotacoes.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 pr-4"><Link href={`/admin/obraplay/cotacoes/${c.code}`} className="text-[#1565C0] font-mono font-medium hover:underline">{c.code}</Link></td>
                    <td className="py-3 pr-4 text-gray-700">{c.buyer}</td>
                    <td className="py-3 pr-4 text-gray-500">{fmtDate(c.date)}</td>
                    <td className="py-3 pr-4"><Badge color={c.status === "convertida" ? "green" : "blue"}>{c.status}</Badge></td>
                    <td className="py-3 pr-4 text-gray-900 font-medium">{fmtBRL(c.total)}</td>
                    <td className="py-3"><Badge color={c.autofilled ? "orange" : "blue"}>{c.autofilled ? "Próprio" : "Marketplace"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Avaliações" && (
            <div className="space-y-4">
              {e.avaliacoes.map((a, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={14} className={s < a.nota ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-100"} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{fmtDate(a.date)}</span>
                      <span>· OC: <Link href={`/admin/obraplay/ordens/${a.oc}`} className="text-[#1565C0] hover:underline">{a.oc}</Link></span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{a.comentario}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "Vitrine" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Item", "Unidade", "Preço", "Disponível"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {e.vitrine.map((v, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{v.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{v.unit}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium">{fmtBRL(v.price)}</td>
                    <td className="py-3">{v.disponivel ? <Badge color="green">Disponível</Badge> : <Badge color="gray">Indisponível</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(tab === "Ordens de Compra" || tab === "Documentos") && (
            <div className="py-8 text-center text-sm text-gray-400">
              Dados carregados via API ObraPlay. Conecte OBRAPLAY_API_TOKEN para visualizar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
