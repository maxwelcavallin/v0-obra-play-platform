"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Dados mockados
const MOCK_USUARIOS = [
  { id: "u1", name: "José Pereira", email: "jose@construtorasp.com.br", phone: "(11) 9 8765-4321", companies_count: 2, created_at: "2024-03-10", is_active: true },
  { id: "u2", name: "Ana Costa", email: "ana@obrasnorte.com.br", phone: "(92) 9 7654-3210", companies_count: 1, created_at: "2024-05-22", is_active: true },
  { id: "u3", name: "Roberto Alves", email: "roberto@constralves.com.br", phone: "(31) 9 6543-2109", companies_count: 1, created_at: "2024-06-01", is_active: false },
  { id: "u4", name: "Fernanda Lima", email: "fernanda@limaconstrucoes.com.br", phone: "(85) 9 5432-1098", companies_count: 3, created_at: "2024-04-15", is_active: true },
  { id: "u5", name: "Carlos Mendes", email: "carlos@mendesengenharia.com.br", phone: "(19) 9 4321-0987", companies_count: 1, created_at: "2024-07-01", is_active: true },
]

export default function UsuariosConstructorPage() {
  const [q, setQ] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos")

  const { data } = useSWR("/api/admin/usuarios", fetcher)
  const apiUsers = data?.users ?? []

  // Usa API se retornar dados; caso contrário usa mock
  const source = apiUsers.length > 0 ? apiUsers : MOCK_USUARIOS

  const filtered = source.filter((u: typeof MOCK_USUARIOS[0]) => {
    if (statusFiltro === "ativo" && !u.is_active) return false
    if (statusFiltro === "inativo" && u.is_active) return false
    if (q && !u.name.toLowerCase().includes(q.toLowerCase()) &&
        !u.email.toLowerCase().includes(q.toLowerCase()) &&
        !u.phone?.includes(q)) return false
    return true
  })

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Usuários Constructor</h1>
          <p className="text-sm text-gray-400">Banco de dados local</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {(["todos", "ativo", "inativo"] as const).map(v => (
              <button key={v} onClick={() => setStatusFiltro(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFiltro === v ? "bg-[#0D1B3E] text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Nome, e-mail ou WhatsApp..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-60 outline-none focus:border-[#1565C0]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nome", "E-mail", "WhatsApp", "Empresas", "Cadastro", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u: typeof MOCK_USUARIOS[0]) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-700 text-center">{u.companies_count ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3"><Badge color={u.is_active ? "green" : "gray"}>{u.is_active ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/usuarios/${u.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} usuário{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
