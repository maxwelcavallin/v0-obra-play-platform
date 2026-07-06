"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate } from "@/components/admin/readonly-badge"

const MOCK = [
  { id: "m1", name: "Carlos Oliveira", email: "carlos@depositocentral.com.br", empresa: "Depósito Central Materiais", empresa_id: "1", role: "owner", status: "ativo", joined: "2024-03-15" },
  { id: "m2", name: "Ana Lima", email: "ana@depositocentral.com.br", empresa: "Depósito Central Materiais", empresa_id: "1", role: "member", status: "ativo", joined: "2024-04-01" },
  { id: "m3", name: "Roberto Mendes", email: "roberto@casaconstrucaonorte.com.br", empresa: "Casa da Construção Norte", empresa_id: "2", role: "owner", status: "ativo", joined: "2024-05-02" },
  { id: "m4", name: "Fernanda Rocha", email: "fernanda@ferroaco.com.br", empresa: "Ferro e Aço Paulista", empresa_id: "3", role: "member", status: "inativo", joined: "2024-06-18" },
]

export default function MembrosObraPlayPage() {
  const [q, setQ] = useState("")
  const filtered = MOCK.filter(m =>
    !q || m.name.toLowerCase().includes(q.toLowerCase()) ||
    m.email.toLowerCase().includes(q.toLowerCase()) ||
    m.empresa.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Membros &amp; Usuários</h1>
            <p className="text-sm text-gray-400">via API Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Nome, e-mail ou empresa..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-64 outline-none focus:border-[#1565C0]" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nome", "E-mail", "Empresa", "Papel", "Status", "Entrada"].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.email}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/empresas/${m.empresa_id}`} className="text-[#1565C0] hover:underline text-xs">{m.empresa}</Link>
                </td>
                <td className="px-4 py-3"><Badge color={m.role === "owner" ? "purple" : "gray"}>{m.role}</Badge></td>
                <td className="px-4 py-3"><Badge color={m.status === "ativo" ? "green" : "gray"}>{m.status}</Badge></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(m.joined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} membro{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
