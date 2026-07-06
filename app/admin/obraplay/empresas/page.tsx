"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { ReadonlyBadge, Badge, fmtDate, fmtBRL } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Dados mockados realistas
const MOCK: Company[] = [
  { id: "1", full_name: "Depósito Central Materiais", cnpj: "12.345.678/0001-90", city: "São Paulo", state: "SP", email: "contato@depositocentral.com.br", phone: "(11) 3456-7890", verified_cnpj: true, has_confirmed_address: true, has_confirmed_configuration: true, has_active_institutional_page: true, has_autofill_enabled: false, base_freight_micros: 0, operation_types: ["Materiais de construção", "Cimento"], created_at: "2024-03-15" },
  { id: "2", full_name: "Casa da Construção Norte", cnpj: "98.765.432/0001-10", city: "Manaus", state: "AM", email: "vendas@casaconstrucaonorte.com.br", phone: "(92) 9876-5432", verified_cnpj: true, has_confirmed_address: true, has_confirmed_configuration: false, has_active_institutional_page: false, has_autofill_enabled: true, base_freight_micros: 45000000, operation_types: ["Areia", "Brita"], created_at: "2024-05-02" },
  { id: "3", full_name: "Ferro e Aço Paulista", cnpj: "45.678.901/0001-23", city: "Campinas", state: "SP", email: "comercial@ferroaco.com.br", phone: "(19) 3344-5566", verified_cnpj: false, has_confirmed_address: true, has_confirmed_configuration: true, has_active_institutional_page: true, has_autofill_enabled: false, base_freight_micros: 80000000, operation_types: ["Ferragens", "Aço"], created_at: "2024-06-18" },
  { id: "4", full_name: "Tintas Irmãos Souza", cnpj: "32.109.876/0001-45", city: "Belo Horizonte", state: "MG", email: "bh@tintassouza.com.br", phone: "(31) 4455-6677", verified_cnpj: true, has_confirmed_address: false, has_confirmed_configuration: true, has_active_institutional_page: false, has_autofill_enabled: true, base_freight_micros: 0, operation_types: ["Tintas", "Revestimentos"], created_at: "2024-07-01" },
  { id: "5", full_name: "Material Hidráulico Nordeste", cnpj: "76.543.210/0001-67", city: "Fortaleza", state: "CE", email: "hidraulico@mhn.com.br", phone: "(85) 9900-1122", verified_cnpj: true, has_confirmed_address: true, has_confirmed_configuration: true, has_active_institutional_page: true, has_autofill_enabled: false, base_freight_micros: 25000000, operation_types: ["Hidráulica", "Elétrica"], created_at: "2024-04-20" },
]

type Company = {
  id: string; full_name: string; cnpj: string; city: string; state: string
  email: string; phone: string; verified_cnpj: boolean
  has_confirmed_address: boolean; has_confirmed_configuration: boolean
  has_active_institutional_page: boolean; has_autofill_enabled: boolean
  base_freight_micros: number; operation_types: string[]; created_at: string
}

function BoolIcon({ v }: { v: boolean }) {
  return v
    ? <CheckCircle2 size={14} className="text-green-600" />
    : <XCircle size={14} className="text-gray-300" />
}

export default function EmpresasFornecedorasPage() {
  const [q, setQ] = useState("")
  const companies = MOCK.filter(c =>
    !q || c.full_name.toLowerCase().includes(q.toLowerCase()) ||
    c.cnpj.includes(q) || c.email.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Empresas Fornecedoras</h1>
            <p className="text-sm text-gray-400">via API Obra Play Fornecedor</p>
          </div>
          <ReadonlyBadge />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white w-72 outline-none focus:border-[#1565C0]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Empresa</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Cidade/UF</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Operações</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">CNPJ Ver.</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Vitrine</th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Autofill</th>
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Frete base</th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {companies.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.full_name}</p>
                  <p className="text-xs text-gray-400">{c.cnpj}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.city}, {c.state}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.operation_types.slice(0, 2).map(op => (
                      <Badge key={op} color="blue">{op}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.verified_cnpj} /></td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.has_active_institutional_page} /></td>
                <td className="px-4 py-3 text-center"><BoolIcon v={c.has_autofill_enabled} /></td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {c.base_freight_micros === 0 ? <Badge color="green">Grátis</Badge> : fmtBRL(c.base_freight_micros)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/obraplay/empresas/${c.id}`} className="text-[#1565C0] hover:underline flex items-center gap-1 text-xs whitespace-nowrap">
                    Ver <ExternalLink size={11} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{companies.length} empresa{companies.length !== 1 ? "s" : ""} encontrada{companies.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  )
}
