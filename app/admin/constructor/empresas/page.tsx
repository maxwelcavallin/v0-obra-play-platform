"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, ExternalLink, Wifi, WifiOff } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const MOCK = [
  { id: "e1", fantasy_name: "Construtora SP Ltda", company_name: "Construtora SP LTDA", cnpj: "11.222.333/0001-44", city: "São Paulo", state: "SP", users_count: 5, cotacoes_count: 12, ocs_count: 8, volume_ocs: 94500000, whatsapp_status: "conectado", is_active: true },
  { id: "e2", fantasy_name: "Obras Norte Engenharia", company_name: "Obras Norte Engenharia S/A", cnpj: "55.666.777/0001-88", city: "Manaus", state: "AM", users_count: 3, cotacoes_count: 7, ocs_count: 4, volume_ocs: 42000000, whatsapp_status: "desconectado", is_active: true },
  { id: "e3", fantasy_name: "Mendes & Alves Construções", company_name: "Mendes e Alves Construções EIRELI", cnpj: "99.000.111/0001-22", city: "Belo Horizonte", state: "MG", users_count: 2, cotacoes_count: 3, ocs_count: 1, volume_ocs: 18200000, whatsapp_status: null, is_active: false },
  { id: "e4", fantasy_name: "Lima Construções Nordeste", company_name: "Lima Construções LTDA", cnpj: "33.444.555/0001-66", city: "Fortaleza", state: "CE", users_count: 8, cotacoes_count: 20, ocs_count: 15, volume_ocs: 215600000, whatsapp_status: "conectado", is_active: true },
]

export default function EmpresasConstutorasPage() {
  const [q, setQ] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">("todos")

  const { data } = useSWR("/api/admin/empresas", fetcher)
  const apiEmpresas = data?.companies ?? []
  const source = apiEmpresas.length > 0 ? apiEmpresas : MOCK

  const filtered = source.filter((e: typeof MOCK[0]) => {
    if (statusFiltro === "ativo" && !e.is_active) return false
    if (statusFiltro === "inativo" && e.is_active) return false
    if (q && !e.fantasy_name.toLowerCase().includes(q.toLowerCase()) &&
        !e.cnpj.includes(q) && !e.city.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

  function WhatsappStatus({ status }: { status: string | null }) {
    if (!status) return <span className="text-xs text-gray-300">—</span>
    return status === "conectado"
      ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Wifi size={11} /> Conectado</span>
      : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><WifiOff size={11} /> Desconectado</span>
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Empresas Construtoras</h1>
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
              placeholder="Nome, CNPJ ou cidade..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-60 outline-none focus:border-[#1565C0]" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Empresa", "Cidade/UF", "Usuários", "Cotações", "OCs", "Volume R$", "Agente IA", "Status", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((e: typeof MOCK[0]) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 truncate max-w-[180px]">{e.fantasy_name}</p>
                  <p className="text-xs text-gray-400">{e.cnpj}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{e.city}, {e.state}</td>
                <td className="px-4 py-3 text-center text-gray-700">{e.users_count}</td>
                <td className="px-4 py-3 text-center text-gray-700">{e.cotacoes_count}</td>
                <td className="px-4 py-3 text-center text-gray-700">{e.ocs_count}</td>
                <td className="px-4 py-3 font-medium text-gray-900 text-xs">{fmtBRL(e.volume_ocs)}</td>
                <td className="px-4 py-3"><WhatsappStatus status={e.whatsapp_status} /></td>
                <td className="px-4 py-3"><Badge color={e.is_active ? "green" : "gray"}>{e.is_active ? "Ativo" : "Inativo"}</Badge></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/constructor/empresas/${e.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} empresa{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
