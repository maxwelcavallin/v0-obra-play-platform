"use client"

import { use } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Package } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_COLOR: Record<string, "green" | "blue" | "orange" | "gray"> = {
  "Entregue": "green",
  "Em andamento": "blue",
  "Aguardando confirmação": "orange",
  "Cancelada": "gray",
}

export default function DetalheOCObraPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading } = useSWR(`/api/admin/obraplay/ordens/${id}`, fetcher)
  const oc = data?.oc

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/obraplay/ordens" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} className="text-gray-500" />
        </Link>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {isLoading ? "Carregando..." : oc?.code ?? `OC #${id}`}
            </h1>
            <p className="text-sm text-gray-400">Detalhe da Ordem de Compra</p>
          </div>
          <ReadonlyBadge />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Carregando...</div>
      ) : !oc ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Package size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Ordem de compra não encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Header info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Status</p>
                <Badge color={STATUS_COLOR[oc.status] ?? "gray"}>{oc.status}</Badge>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Total</p>
                <p className="text-sm font-bold text-gray-900">{fmtBRL(oc.total)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Criada em</p>
                <p className="text-sm text-gray-700">{fmtDate(oc.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Entrega prevista</p>
                <p className="text-sm text-gray-700">{fmtDate(oc.arrival_estimate)}</p>
              </div>
            </div>
          </div>

          {/* Partes envolvidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Empresa Construtora</p>
              <p className="text-sm font-medium text-gray-900">{oc.company_name ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-1">{oc.requester_name ?? "—"} · {oc.requester_email ?? "—"}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Fornecedor</p>
              <p className="text-sm font-medium text-gray-900">{oc.supplier_name ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-1">{oc.supplier_email ?? "—"}</p>
            </div>
          </div>

          {/* Condições */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Condições Comerciais</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Pagamento</p>
                <p className="text-sm text-gray-700">{oc.payment_method ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Frete</p>
                <p className="text-sm text-gray-700">{oc.freight_total ? fmtBRL(oc.freight_total) : "Grátis"}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">ID ObraPlay</p>
                <p className="font-mono text-xs text-gray-500">{oc.obraplay_order_id ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Itens */}
          {oc.items?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Itens ({oc.items.length})</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Item", "Unidade", "Quantidade", "Preço unit.", "Total"].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {oc.items.map((item: Record<string, unknown>, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{String(item.name ?? "—")}</td>
                      <td className="px-4 py-3 text-gray-500">{String(item.unit ?? "—")}</td>
                      <td className="px-4 py-3 text-gray-700">{String(item.quantity ?? "—")}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtBRL(Number(item.unit_price_micros ?? 0))}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmtBRL(Number(item.total_micros ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
