"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Building2, Users, ShoppingCart, Calendar } from "lucide-react"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function DetalheEmpresaConstrutora() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data } = useSWR(`/api/admin/constructor/empresas/${id}`, fetcher)

  const empresa = data?.empresa
  const usuarios = data?.usuarios ?? []
  const cotacoes = data?.cotacoes ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#616161] hover:text-[#212121]">
        <ArrowLeft size={16} /> Voltar
      </button>

      {!empresa ? (
        <div className="text-sm text-[#9E9E9E]">Carregando...</div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white rounded-xl border border-[#EEEEEE] p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-[#1565C0]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-[#212121]">{empresa.fantasy_name || empresa.company_name}</h1>
                <p className="text-sm text-[#616161]">{empresa.company_name}</p>
                {empresa.cnpj && <p className="text-xs text-[#9E9E9E] mt-0.5">CNPJ: {empresa.cnpj}</p>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                empresa.is_active !== false ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"
              }`}>
                {empresa.is_active !== false ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Cadastro", value: fmtDate(empresa.created_at), icon: Calendar },
                { label: "Cidade", value: empresa.city ? `${empresa.city}/${empresa.state}` : "—", icon: Building2 },
                { label: "Usuários", value: usuarios.length, icon: Users },
                { label: "Cotações", value: cotacoes.length, icon: ShoppingCart },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-[#F7F7F7] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[#9E9E9E] text-xs mb-1">
                    <Icon size={12} /> {label}
                  </div>
                  <p className="text-sm font-semibold text-[#212121]">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Usuários */}
          <div className="bg-white rounded-xl border border-[#EEEEEE] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEEEEE]">
              <h2 className="text-sm font-semibold text-[#212121] flex items-center gap-2">
                <Users size={15} /> Usuários ({usuarios.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  {["Nome", "E-mail", "Perfil", "Status", "Desde"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#9E9E9E] px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-medium text-[#212121]">{String(u.name)}</td>
                    <td className="px-4 py-3 text-[#616161]">{String(u.email)}</td>
                    <td className="px-4 py-3 text-[#616161]">{u.role === "admin" ? "Admin" : "Usuário"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F5F5F5] text-[#9E9E9E]"
                      }`}>{u.status === "active" ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-4 py-3 text-[#9E9E9E]">{fmtDate(u.created_at as string)}</td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[#9E9E9E]">Nenhum usuário</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cotações recentes */}
          <div className="bg-white rounded-xl border border-[#EEEEEE] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EEEEEE]">
              <h2 className="text-sm font-semibold text-[#212121] flex items-center gap-2">
                <ShoppingCart size={15} /> Cotações recentes ({cotacoes.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  {["Identificador", "Obra", "Status", "Itens", "Criada em"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#9E9E9E] px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((c: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-t border-[#F5F5F5] hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono text-xs text-[#1565C0]">{String(c.identifier)}</td>
                    <td className="px-4 py-3 text-[#616161]">{String(c.obra_name || "—")}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-[#F5F5F5] text-[#616161] px-2 py-0.5 rounded-full">{String(c.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-[#616161]">{String(c.item_count ?? 0)}</td>
                    <td className="px-4 py-3 text-[#9E9E9E]">{fmtDate(c.created_at as string)}</td>
                  </tr>
                ))}
                {cotacoes.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[#9E9E9E]">Nenhuma cotação</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
