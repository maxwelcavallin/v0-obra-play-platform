"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, UserX, KeyRound } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"

const MOCK = {
  id: "u1", name: "José Pereira", email: "jose@construtorasp.com.br",
  phone: "(11) 9 8765-4321", is_active: true, created_at: "2024-03-10",
  obraplay_user_id: "OP-88241",
  empresas: [
    { id: "e1", name: "Construtora SP Ltda", role: "admin", joined: "2024-03-10" },
    { id: "e2", name: "Obras Norte Engenharia", role: "member", joined: "2024-06-20" },
  ],
  cotacoes: [
    { id: "c1", identifier: "COT-001", obra: "Residencial Pinheiros", status: "Respondida", created_at: "2026-06-20" },
    { id: "c2", identifier: "COT-002", obra: "Obras Norte Bloco A", status: "Rascunho", created_at: "2026-07-01" },
  ],
  ocs: [
    { id: "oc1", identifier: "OC-ZMSDNDL", supplier: "Depósito Central Materiais", status: "Enviada", total: 8200000, created_at: "2026-06-23" },
  ],
}

export default function UsuarioDetalhe() {
  const [tab, setTab] = useState("Empresas")
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const u = MOCK

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="max-w-[1000px] mx-auto">
      <Link href="/admin/constructor/usuarios" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Usuários Constructor
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D1B3E] flex items-center justify-center text-white font-bold text-lg shrink-0">
              {u.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{u.name}</h1>
                <Badge color={u.is_active ? "green" : "gray"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{u.email} · {u.phone}</p>
              {u.obraplay_user_id && (
                <p className="text-xs text-gray-400 mt-0.5">ObraPlay ID: {u.obraplay_user_id}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">Cadastro: {fmtDate(u.created_at)}</p>
            </div>
          </div>

          {/* Ações super admin */}
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirmAction("toggle")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                u.is_active
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-green-200 text-green-600 hover:bg-green-50"
              }`}>
              <UserX size={13} /> {u.is_active ? "Desativar" : "Ativar"}
            </button>
            <button onClick={() => setConfirmAction("reset")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <KeyRound size={13} /> Link de recuperação
            </button>
          </div>
        </div>

        {/* Modal de confirmação */}
        {confirmAction && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                {confirmAction === "toggle"
                  ? `Confirmar ${u.is_active ? "desativação" : "ativação"} do usuário?`
                  : "Gerar link de recuperação de senha? O link será exibido uma vez."}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmAction(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white">Cancelar</button>
              <button onClick={() => setConfirmAction(null)} className="px-3 py-1.5 text-xs bg-[#0D1B3E] text-white rounded-lg hover:bg-[#1565C0]">Confirmar</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {["Empresas", "Cotações geradas", "Ordens de Compra"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "Empresas" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Empresa", "Papel", "Entrada"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {u.empresas.map(e => (
                  <tr key={e.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/constructor/empresas/${e.id}`} className="font-medium text-[#1565C0] hover:underline">{e.name}</Link>
                    </td>
                    <td className="py-3 pr-4"><Badge color={e.role === "admin" ? "purple" : "gray"}>{e.role}</Badge></td>
                    <td className="py-3 text-gray-500 text-xs">{fmtDate(e.joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Cotações geradas" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Identificador", "Obra", "Status", "Criada em"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {u.cotacoes.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/constructor/cotacoes/${c.id}`} className="font-mono text-xs font-semibold text-[#1565C0] hover:underline">{c.identifier}</Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{c.obra}</td>
                    <td className="py-3 pr-4"><Badge color={c.status === "Respondida" ? "green" : "gray"}>{c.status}</Badge></td>
                    <td className="py-3 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Ordens de Compra" && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {["Identificador", "Fornecedor", "Status", "Total", "Criada em"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {u.ocs.map(o => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/constructor/ordens/${o.id}`} className="font-mono text-xs font-semibold text-[#1565C0] hover:underline">{o.identifier}</Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{o.supplier}</td>
                    <td className="py-3 pr-4"><Badge color="blue">{o.status}</Badge></td>
                    <td className="py-3 pr-4 font-medium text-gray-900">{fmtBRL(o.total)}</td>
                    <td className="py-3 text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
