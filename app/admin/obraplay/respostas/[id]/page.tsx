"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

export default function RespostaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useSWR(`/api/admin/obraplay/respostas/${id}`, fetcher)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-gray-400" />
    </div>
  )

  if (!data || data.error) return (
    <div className="text-center py-20 text-gray-400 text-sm">Resposta não encontrada.</div>
  )

  const r = data
  const itens: any[] = r.itens ?? []

  // Totais calculados corretamente:
  // unit_price_micros está em micros (÷1_000_000 = R$)
  // quantity_answered é número normal (não micros)
  // total por item = unit_price_micros * quantity_answered / 1_000_000
  const subtotal = itens.reduce((acc: number, it: any) => {
    const price = Number(it.unit_price_micros) || 0
    const qty = Number(it.quantity_answered) || 0
    return acc + (price * qty)
  }, 0)
  const frete = itens[0]?.total_freight_micros ? Number(itens[0].total_freight_micros) : 0

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link href="/admin/obraplay/respostas" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Respostas de Cotação
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{r.supplier_name}</h1>
              <span className="text-gray-400">·</span>
              <Link href={`/admin/obraplay/cotacoes/${r.cotacao_id}`} className="font-mono text-sm text-[#1565C0] hover:underline">{r.cotacao_identifier}</Link>
              <ReadonlyBadge />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Pagamento</p>
                <p className="text-gray-700 font-medium">{r.payment_method ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Prazo de entrega</p>
                <p className="text-gray-700 font-medium">{r.arrival_estimate ? fmtDate(r.arrival_estimate) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Respondida em</p>
                <p className="text-gray-700 font-medium">{r.answered_at ? fmtDate(r.answered_at) : "—"}</p>
              </div>
            </div>
            {r.observations && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{r.observations}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400 mb-0.5">Total estimado</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL((subtotal + frete) / 1_000_000)}</p>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Itens respondidos ({itens.length})</h2>
        </div>
        <div className="p-5">
          {itens.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum item.</p>
          ) : (
            <>
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b border-gray-100">
                  {["Item", "Qtd cotada", "Un.", "Preço unit.", "Total", "Disp.", "Desconto"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {itens.map((it: any) => (
                    <tr key={`${it.cotacao_item_id}-${it.op_item_id}`}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{it.item_name}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {/* quantity_answered já é número normal, não micros */}
                        {Number(it.quantity_answered).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{it.item_unit}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {Number(it.unit_price_micros) > 0 ? fmtBRL(Number(it.unit_price_micros) / 1_000_000) : "—"}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {/* total = preço_unitário × quantidade_respondida */}
                        {Number(it.unit_price_micros) > 0 && Number(it.quantity_answered) > 0
                          ? fmtBRL((Number(it.unit_price_micros) * Number(it.quantity_answered)) / 1_000_000)
                          : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {it.available
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <XCircle size={14} className="text-red-400" />}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {it.total_discount_micros && Number(it.total_discount_micros) > 0
                          ? fmtBRL(Number(it.total_discount_micros) / 1_000_000)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totais */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{fmtBRL(subtotal / 1_000_000)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Frete</span>
                    <span>{frete > 0 ? fmtBRL(frete / 1_000_000) : "Grátis"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                    <span>Total</span>
                    <span>{fmtBRL((subtotal + frete) / 1_000_000)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
