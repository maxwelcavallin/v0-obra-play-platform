"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const MOCK = {
  id: "1", code: "UHUTQJG",
  name: "José Pereira", email: "jose@construtorasp.com.br", phone: "(11) 9 8765-4321",
  published_at: "2026-06-20", requirement_date: "2026-07-10", expires_at: "2026-07-05",
  is_answered: true, is_converted: true, autofilled: false,
  foreign_id: "EMP-00042",
  itens: [
    { name: "Cimento CP-II 50kg", quantity: 200, unit: "Saca" },
    { name: "Areia média lavada", quantity: 15, unit: "m³" },
    { name: "Brita 1", quantity: 10, unit: "m³" },
  ],
  enderecos: [
    { obra: "Residencial Pinheiros", street: "Rua das Flores, 500", city: "São Paulo", state: "SP" },
  ],
  respostas: [
    { id: "r1", fornecedor: "Depósito Central Materiais", fornecedor_id: "1", status: "respondida", total: 8200000, frete: 0, date: "2026-06-22", autofilled: false },
    { id: "r2", fornecedor: "Ferro e Aço Paulista", fornecedor_id: "3", status: "respondida", total: 9100000, frete: 80000000, date: "2026-06-21", autofilled: false },
  ],
  recusas: [
    { fornecedor: "Tintas Irmãos Souza", motivo: "Fora do raio de entrega" },
  ],
  mensagens: [
    { autor: "Sistema", texto: "Cotação publicada para fornecedores.", date: "2026-06-20T10:00:00" },
    { autor: "José Pereira", texto: "Preciso de entrega urgente até dia 10/07.", date: "2026-06-20T10:15:00" },
  ],
  anexos: [
    { name: "memorial-descritivo.pdf", size: "1.2 MB", date: "2026-06-20" },
  ],
}

const TABS = ["Itens", "Endereços", "Respostas", "Recusas", "Mensagens", "Anexos"]

export default function CotacaoDetalhe() {
  const [tab, setTab] = useState("Itens")
  const c = MOCK

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
              <h1 className="text-lg font-bold text-gray-900 font-mono">{c.code}</h1>
              <Badge color={c.is_converted ? "green" : "blue"}>{c.is_converted ? "Convertida" : "Respondida"}</Badge>
              <Badge color={c.autofilled ? "orange" : "blue"}>{c.autofilled ? "Próprio" : "Marketplace"}</Badge>
              <ReadonlyBadge />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <span>{c.name}</span>
              <span>{c.email}</span>
              <span>{c.phone}</span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span>Publicada: {fmtDate(c.published_at)}</span>
              <span>Necessidade: {fmtDate(c.requirement_date)}</span>
              <span>Expira: {fmtDate(c.expires_at)}</span>
            </div>
          </div>
          {c.foreign_id && (
            <Link href={`/admin/constructor/cotacoes/${c.foreign_id}`}
              className="flex items-center gap-1.5 text-xs bg-[#EEF2FF] text-[#1565C0] border border-[#C7D7F5] rounded-lg px-3 py-2 hover:bg-[#E0EAFF] transition-colors whitespace-nowrap">
              <ExternalLink size={12} /> Ver no Constructor
            </Link>
          )}
        </div>
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
          {tab === "Itens" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Item", "Quantidade", "Unidade"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {c.itens.map((it, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{it.name}</td>
                    <td className="py-3 pr-4 text-gray-700">{it.quantity}</td>
                    <td className="py-3 text-gray-500">{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Endereços" && (
            <div className="space-y-3">
              {c.enderecos.map((e, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4">
                  <p className="font-medium text-gray-900 mb-1">{e.obra}</p>
                  <p className="text-sm text-gray-500">{e.street} · {e.city}/{e.state}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "Respostas" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Fornecedor", "Status", "Valor total", "Frete", "Data", "Tipo"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {c.respostas.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/obraplay/empresas/${r.fornecedor_id}`} className="font-medium text-[#1565C0] hover:underline">{r.fornecedor}</Link>
                    </td>
                    <td className="py-3 pr-4"><Badge color="blue">{r.status}</Badge></td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{fmtBRL(r.total)}</td>
                    <td className="py-3 pr-4 text-gray-600">{r.frete === 0 ? "Grátis" : fmtBRL(r.frete)}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{fmtDate(r.date)}</td>
                    <td className="py-3"><Badge color={r.autofilled ? "orange" : "blue"}>{r.autofilled ? "Próprio" : "Marketplace"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Recusas" && (
            <div className="space-y-3">
              {c.recusas.map((r, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
                  <p className="font-medium text-gray-900">{r.fornecedor}</p>
                  <p className="text-sm text-gray-500">{r.motivo}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "Mensagens" && (
            <div className="space-y-3 max-w-2xl">
              {c.mensagens.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.autor === "Sistema" ? "opacity-60" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-[#0D1B3E] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {m.autor.charAt(0)}
                  </div>
                  <div className="flex-1">
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
              {c.anexos.map((a, i) => (
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
