"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const MOCK = {
  id: "r1",
  fornecedor: "Depósito Central Materiais", fornecedor_id: "1",
  cotacao: "UHUTQJG", cotacao_id: "1",
  autofilled: false,
  payment_method: "Boleto 30 dias",
  arrival_estimate: "2026-07-08",
  valid_until: "2026-07-05",
  itens: [
    { name: "Cimento CP-II 50kg", qtd: 200, unit: "Saca", preco: 37000000, total: 7400000000, disponivel: true },
    { name: "Areia média lavada", qtd: 15, unit: "m³", preco: 110000000, total: 1650000000, disponivel: true },
    { name: "Brita 1", qtd: 10, unit: "m³", preco: 115000000, total: 1150000000, disponivel: false },
  ],
  subtotal: 10200000000,
  frete: 0,
  total: 10200000000,
  mensagens: [
    { autor: "Carlos Oliveira", texto: "Posso entregar na quinta-feira de manhã.", date: "2026-06-22T14:00:00" },
    { autor: "José Pereira", texto: "Ótimo! Confirmo o recebimento.", date: "2026-06-22T14:30:00" },
  ],
  anexos: [{ name: "proposta-deposito-central.pdf", size: "340 KB", date: "2026-06-22" }],
}

export default function RespostaDetalhe() {
  const [tab, setTab] = useState("Itens")
  const r = MOCK

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link href="/admin/obraplay/respostas" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Respostas de Cotação
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                <Link href={`/admin/obraplay/empresas/${r.fornecedor_id}`} className="text-[#1565C0] hover:underline">{r.fornecedor}</Link>
              </h1>
              <span className="text-gray-400">·</span>
              <Link href={`/admin/obraplay/cotacoes/${r.cotacao_id}`} className="font-mono text-sm text-[#1565C0] hover:underline">{r.cotacao}</Link>
              <Badge color={r.autofilled ? "orange" : "blue"}>{r.autofilled ? "Próprio" : "Marketplace"}</Badge>
              <ReadonlyBadge />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-6 text-sm">
              <div><p className="text-xs text-gray-400 mb-0.5">Pagamento</p><p className="text-gray-700 font-medium">{r.payment_method}</p></div>
              <div><p className="text-xs text-gray-400 mb-0.5">Prazo de entrega</p><p className="text-gray-700 font-medium">{fmtDate(r.arrival_estimate)}</p></div>
              <div><p className="text-xs text-gray-400 mb-0.5">Válido até</p><p className="text-gray-700 font-medium">{fmtDate(r.valid_until)}</p></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Total da proposta</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(r.total)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {["Itens", "Mensagens", "Anexos"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "Itens" && (
            <>
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b border-gray-100">
                  {["Item", "Qtd", "Un.", "Preço unit.", "Total", "Disp."].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {r.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{it.name}</td>
                      <td className="py-3 pr-4 text-gray-700">{it.qtd}</td>
                      <td className="py-3 pr-4 text-gray-500">{it.unit}</td>
                      <td className="py-3 pr-4 text-gray-700">{fmtBRL(it.preco)}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{fmtBRL(it.total / 1_000_000)}</td>
                      <td className="py-3">{it.disponivel
                        ? <CheckCircle2 size={14} className="text-green-600" />
                        : <XCircle size={14} className="text-red-400" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtBRL(r.subtotal / 1_000_000)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Frete</span><span>{r.frete === 0 ? "Grátis" : fmtBRL(r.frete)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>{fmtBRL(r.total / 1_000_000)}</span></div>
                </div>
              </div>
            </>
          )}

          {tab === "Mensagens" && (
            <div className="space-y-3 max-w-2xl">
              {r.mensagens.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0D1B3E] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {m.autor.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-800">{m.autor}</span>
                      <span className="text-[10px] text-gray-400">{new Date(m.date).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 inline-block">{m.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "Anexos" && (
            <div className="space-y-2">
              {r.anexos.map((a, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.size} · {fmtDate(a.date)}</p>
                  </div>
                  <button className="text-xs text-[#1565C0] hover:underline">Download</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
