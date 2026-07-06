"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

const TABS = ["Dados cadastrais", "Membros", "Cotações vinculadas"]

export default function EmpresaFornecedoraDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState("Dados cadastrais")
  const { data, isLoading } = useSWR(`/api/admin/obraplay/empresas/${id}`, fetcher)

  const e = data?.empresa
  const membros: any[] = data?.membros ?? []
  const cotacoes: any[] = data?.cotacoes_vinculadas ?? []

  function MetricCard({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    )
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-gray-400" />
    </div>
  )

  if (!e) return (
    <div className="text-center py-20 text-gray-400 text-sm">Empresa não encontrada.</div>
  )

  const avgResponseH = e.avg_response_time_minutes ? Math.round(Number(e.avg_response_time_minutes) / 60) : null

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link href="/admin/obraplay/empresas" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Empresas Fornecedoras
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {e.logo ? (
              <img src={e.logo} alt={e.short_name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 shrink-0">
                {(e.short_name ?? e.full_name ?? "?").charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{e.full_name ?? e.short_name}</h1>
                {e.verified_cnpj && <Badge color="green">CNPJ verificado</Badge>}
                {e.has_confirmed_address && <Badge color="blue">Endereço confirmado</Badge>}
                {e.registration_type === "certified" && <Badge color="orange">Credenciado</Badge>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{e.cnpj} · {e.city}, {e.state}</p>
              {e.email && <p className="text-sm text-gray-500">{e.email}{e.phone ? ` · ${e.phone}` : ""}</p>}
            </div>
          </div>
          <ReadonlyBadge />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <MetricCard label="Cotações respondidas" value={e.finalized_answers_count ?? 0} />
        <MetricCard label="Avaliações" value={e.total_reviews ?? 0} />
        <MetricCard label="Nota média" value={e.rating ? Number(e.rating).toFixed(1) : "—"} />
        <MetricCard label="Tempo médio resp." value={avgResponseH != null ? `${avgResponseH}h` : "—"} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "Dados cadastrais" && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Endereço</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  {e.street && <p>{e.street}{e.number ? `, ${e.number}` : ""}</p>}
                  {e.neighbourhood && <p>{e.neighbourhood} · CEP {e.zipcode}</p>}
                  <p>{e.city} — {e.state}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contato</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  {e.email && <p>{e.email}</p>}
                  {e.phone && <p>{e.phone}</p>}
                  {e.whatsapp && <p>WhatsApp: {e.whatsapp}</p>}
                </div>
              </div>
              {e.category_names && Array.isArray(e.category_names) && e.category_names.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Categorias</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {e.category_names.map((cat: string) => <Badge key={cat} color="blue">{cat}</Badge>)}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Configurações</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["CNPJ verificado", e.verified_cnpj],
                    ["Endereço confirmado", e.has_confirmed_address],
                    ["Config confirmada", e.has_confirmed_configuration],
                    ["Entrega confirmada", e.has_confirmed_shipping],
                    ["Vitrine ativa", e.has_active_institutional_page],
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
            membros.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum membro encontrado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Nome", "E-mail", "Papel", "Ativo"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {membros.map((m: any) => (
                    <tr key={m.member_id ?? m.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{m.name}</td>
                      <td className="py-3 pr-4 text-gray-500">{m.email}</td>
                      <td className="py-3 pr-4"><Badge color="blue">{m.role}</Badge></td>
                      <td className="py-3">{m.is_active ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-300" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "Cotações vinculadas" && (
            cotacoes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhuma cotação vinculada encontrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Identificador", "Empresa", "Itens", "Status", "Criada em"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {cotacoes.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/obraplay/cotacoes/${c.id ?? c.identifier}`} className="font-mono text-xs font-semibold text-[#1565C0] hover:underline">{c.identifier}</Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-sm">{c.company_name ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-700">{c.item_count ?? "—"}</td>
                      <td className="py-3 pr-4"><Badge color={c.status === "Respondida" ? "green" : "gray"}>{c.status}</Badge></td>
                      <td className="py-3 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}
