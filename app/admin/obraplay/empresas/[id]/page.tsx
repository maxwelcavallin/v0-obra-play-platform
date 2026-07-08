"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Star, ExternalLink, Calendar, Package } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

const TABS = ["Dados cadastrais", "Membros", "Cotações respondidas", "Avaliações", "Vitrine"]

function DateRangeFilter({ gte, lte, onGte, onLte }: {
  gte: string; lte: string; onGte: (v: string) => void; onLte: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <label className="text-xs text-gray-500 font-medium">Período:</label>
      <input type="date" value={gte} onChange={e => onGte(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#1565C0]" />
      <span className="text-xs text-gray-400">até</span>
      <input type="date" value={lte} onChange={e => onLte(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-[#1565C0]" />
    </div>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12}
          className={i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </div>
  )
}

export default function EmpresaFornecedoraDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState("Dados cadastrais")
  const [gte, setGte] = useState("")
  const [lte, setLte] = useState("")

  const { data, isLoading } = useSWR(`/api/admin/obraplay/empresas/${id}`, fetcher)
  const { data: metricsData } = useSWR(`/api/admin/obraplay/empresas/${id}/tabs?tab=metricas`, fetcher)

  // Tabs carregadas sob demanda
  const { data: cotacoesData, isLoading: loadingCotacoes } = useSWR(
    tab === "Cotações respondidas"
      ? `/api/admin/obraplay/empresas/${id}/tabs?tab=cotacoes&gte=${gte}&lte=${lte}`
      : null,
    fetcher
  )
  const { data: avaliacoesData, isLoading: loadingAvaliacoes } = useSWR(
    tab === "Avaliações" ? `/api/admin/obraplay/empresas/${id}/tabs?tab=avaliacoes` : null,
    fetcher
  )
  const { data: vitrineData, isLoading: loadingVitrine } = useSWR(
    tab === "Vitrine" ? `/api/admin/obraplay/empresas/${id}/tabs?tab=vitrine` : null,
    fetcher
  )

  const e = data?.empresa
  const membros: any[] = data?.membros ?? []
  const metrics = metricsData?.metrics ?? {}
  const cotacoes: any[] = cotacoesData?.results ?? []
  const avaliacoes: any[] = avaliacoesData?.results ?? []
  const vitrineItems: any[] = vitrineData?.results ?? []

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
  const metricsReceived  = metrics.received  ?? e.finalized_answers_count ?? 0
  const metricsAnswered  = metrics.answered  ?? 0
  const metricsRate      = metricsReceived > 0 ? Math.round((metricsAnswered / metricsReceived) * 100) : "—"
  const metricsOcs       = metrics.orders_count ?? 0
  const metricsTicket    = metrics.avg_ticket_micros != null
    ? (Number(metrics.avg_ticket_micros) / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—"

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
                {e.has_active_institutional_page && <Badge color="blue">Vitrine ativa</Badge>}
                {e.registration_type === "certified" && <Badge color="orange">Credenciado</Badge>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{e.cnpj} · {e.city}, {e.state}</p>
              {e.email && <p className="text-sm text-gray-500">{e.email}{e.phone ? ` · ${e.phone}` : ""}</p>}
            </div>
          </div>
          <ReadonlyBadge />
        </div>
      </div>

      {/* Métricas da API ObraPlay */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <MetricCard label="Cotações recebidas"  value={metricsReceived} />
        <MetricCard label="Respondidas"         value={metricsAnswered} />
        <MetricCard label="Taxa resposta"        value={metricsRate !== "—" ? `${metricsRate}%` : "—"} />
        <MetricCard label="OCs geradas"          value={metricsOcs} />
        <MetricCard label="Ticket médio"         value={metricsTicket} />
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
          {/* --- Dados cadastrais --- */}
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
                  {([
                    ["CNPJ verificado",    e.verified_cnpj],
                    ["Endereço confirmado", e.has_confirmed_address],
                    ["Config confirmada",  e.has_confirmed_configuration],
                    ["Entrega confirmada", e.has_confirmed_shipping],
                    ["Vitrine ativa",      e.has_active_institutional_page],
                  ] as [string, boolean][]).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-2">
                      {val ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-300" />}
                      <span className="text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Membros --- */}
          {tab === "Membros" && (
            membros.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum membro encontrado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Nome", "E-mail", "Papel", "Validado", "Ingresso"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {membros.map((m: any) => (
                    <tr key={m.member_id ?? m.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{m.name}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{m.email}</td>
                      <td className="py-3 pr-4"><Badge color="blue">{m.role ?? "Membro"}</Badge></td>
                      <td className="py-3 pr-4">
                        {m.is_validated
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <XCircle size={14} className="text-gray-300" />}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">{m.joined_at ? fmtDate(m.joined_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* --- Cotações respondidas --- */}
          {tab === "Cotações respondidas" && (
            <div>
              <DateRangeFilter gte={gte} lte={lte} onGte={setGte} onLte={setLte} />
              {loadingCotacoes ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                </div>
              ) : cotacoes.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">Nenhuma cotação respondida no período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100">
                    {["Código", "Comprador", "Data resposta", "Valor", "Tipo", ""].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {cotacoes.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                        if (c.quotation_id) window.location.href = `/admin/obraplay/cotacoes/${c.quotation_id}`
                      }}>
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs font-semibold text-gray-900">{c.quotation?.code ?? c.code ?? "—"}</span>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 text-xs">{c.company?.short_name ?? c.buyer_name ?? "—"}</td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-gray-400" />
                            {c.published_at ? fmtDate(c.published_at) : "—"}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900 text-xs">
                          {c.total_micros != null
                            ? (Number(c.total_micros) / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {c.own_supplier
                            ? <Badge color="orange">Próprio</Badge>
                            : <Badge color="blue">Marketplace</Badge>}
                        </td>
                        <td className="py-3">
                          <ExternalLink size={12} className="text-gray-300" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* --- Avaliações --- */}
          {tab === "Avaliações" && (
            loadingAvaliacoes ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : avaliacoes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhuma avaliação encontrada.</p>
            ) : (
              <div className="space-y-3">
                {avaliacoes.map((av: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <StarRating value={Number(av.score ?? av.rating ?? 0)} />
                      <span className="text-xs text-gray-400">{av.created_at ? fmtDate(av.created_at) : "—"}</span>
                    </div>
                    {av.comment && <p className="text-sm text-gray-700 leading-relaxed">{av.comment}</p>}
                    {av.reviewer_name && <p className="text-xs text-gray-400 mt-2">por {av.reviewer_name}</p>}
                  </div>
                ))}
              </div>
            )
          )}

          {/* --- Vitrine --- */}
          {tab === "Vitrine" && (
            loadingVitrine ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : vitrineItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum item na vitrine.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Item", "Unidade", "Preço", "Disponível"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {vitrineItems.map((v: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Package size={13} className="text-gray-300 shrink-0" />
                          <span className="font-medium text-gray-900">{v.name ?? v.item_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{v.measurement_unit ?? v.unit ?? "—"}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900 text-xs">
                        {v.price_micros != null
                          ? (Number(v.price_micros) / 1_000_000).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : v.unit_price != null
                          ? Number(v.unit_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "—"}
                      </td>
                      <td className="py-3">
                        {v.is_available !== false
                          ? <Badge color="green">Disponível</Badge>
                          : <Badge color="gray">Indisponível</Badge>}
                      </td>
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
