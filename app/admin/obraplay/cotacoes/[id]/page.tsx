"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Loader2 } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

const TABS = ["Itens", "Fornecedores"]

export default function CotacaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState("Itens")
  const { data, isLoading } = useSWR(`/api/admin/obraplay/cotacoes/${id}`, fetcher)

  const cotacao = data?.cotacao
  const itens: any[] = data?.itens ?? []
  const fornecedores: any[] = data?.fornecedores ?? []

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-gray-400" />
    </div>
  )

  if (!cotacao) return (
    <div className="text-center py-20 text-gray-400 text-sm">Cotação não encontrada.</div>
  )

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link href="/admin/obraplay/cotacoes" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Cotações do Marketplace
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{cotacao.identifier}</h1>
              <Badge color={cotacao.status === "Respondida" ? "green" : cotacao.status === "Rascunho" ? "gray" : "blue"}>{cotacao.status}</Badge>
              {cotacao.is_public && <Badge color="orange">Pública</Badge>}
              <ReadonlyBadge />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              {cotacao.company_name && <span>Empresa: <strong>{cotacao.company_name}</strong></span>}
              {cotacao.obra_name && <span>Obra: <strong>{cotacao.obra_name}</strong></span>}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>Criada: {fmtDate(cotacao.created_at)}</span>
              {cotacao.need_date && <span>Necessidade: {fmtDate(cotacao.need_date)}</span>}
              {cotacao.expiry_date && <span>Expira: {fmtDate(cotacao.expiry_date)}</span>}
              {cotacao.obraplay_quotation_id && <span>OP ID: #{cotacao.obraplay_quotation_id}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t} {t === "Itens" ? `(${itens.length})` : `(${fornecedores.length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "Itens" && (
            itens.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum item encontrado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Item", "Quantidade", "Unidade"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {itens.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{it.name}</td>
                      <td className="py-3 pr-4 text-gray-700">{Number(it.quantity).toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-gray-500">{it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "Fornecedores" && (
            fornecedores.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhum fornecedor vinculado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Fornecedor", "Cidade", "Tipo", "Respondeu", ""].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {fornecedores.map((f: any) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        {f.mirror_company_id ? (
                          <Link href={`/admin/obraplay/empresas/${f.mirror_company_id}`} className="font-medium text-[#1565C0] hover:underline">{f.supplier_name}</Link>
                        ) : (
                          <span className="font-medium text-gray-900">{f.supplier_name}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{f.supplier_city ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge color={f.registration_type === "certified" ? "orange" : f.registration_type === "validated" ? "blue" : "gray"}>
                          {f.registration_type === "certified" ? "Credenciado" : f.registration_type === "validated" ? "Validado" : "Básico"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {f.has_response
                          ? <Badge color="green">Respondeu</Badge>
                          : <Badge color="gray">Aguardando</Badge>}
                      </td>
                      <td className="py-3">
                        {f.id && (
                          <Link href={`/admin/obraplay/respostas/${f.id}`} className="text-xs text-[#1565C0] hover:underline">Ver resposta</Link>
                        )}
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
