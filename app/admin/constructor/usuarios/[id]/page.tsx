"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Shield, UserX, KeyRound, Loader2 } from "lucide-react"
import { Badge, fmtDate } from "@/components/admin/readonly-badge"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

export default function UsuarioDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState("Empresas")
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data, isLoading, mutate } = useSWR(`/api/admin/constructor/usuarios/${id}`, fetcher)

  const u = data?.usuario
  const empresas: any[] = data?.empresas ?? []
  const cotacoes: any[] = data?.cotacoes ?? []

  async function handleToggle() {
    setActionLoading(true)
    await fetch(`/api/admin/constructor/usuarios`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, is_active: !u?.is_active }),
    })
    await mutate()
    setConfirmAction(null)
    setActionLoading(false)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin text-gray-400" />
    </div>
  )

  if (!u) return (
    <div className="text-center py-20 text-gray-400 text-sm">Usuário não encontrado.</div>
  )

  return (
    <div className="max-w-[1000px] mx-auto">
      <Link href="/admin/constructor/usuarios" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Usuários Constructor
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D1B3E] flex items-center justify-center text-white font-bold text-lg shrink-0">
              {u.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{u.name}</h1>
                <Badge color={u.is_active ? "green" : "gray"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
              <p className="text-xs text-gray-400 mt-0.5">Cadastro: {fmtDate(u.created_at)}</p>
            </div>
          </div>

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
              <button
                onClick={confirmAction === "toggle" ? handleToggle : () => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs bg-[#0D1B3E] text-white rounded-lg hover:bg-[#1565C0] disabled:opacity-50">
                {actionLoading ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {["Empresas", "Cotações geradas"].map(t => (
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
            empresas.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhuma empresa vinculada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Empresa", "CNPJ", "Papel", "Admin", "Entrada"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {empresas.map((e: any) => (
                    <tr key={e.id}>
                      <td className="py-3 pr-4">
                        <Link href={`/admin/constructor/empresas/${e.id}`} className="font-medium text-[#1565C0] hover:underline">{e.fantasy_name ?? e.company_name}</Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs font-mono">{e.cnpj ?? "—"}</td>
                      <td className="py-3 pr-4"><Badge color="gray">{e.role}</Badge></td>
                      <td className="py-3 pr-4"><Badge color={e.is_admin ? "orange" : "gray"}>{e.is_admin ? "Sim" : "Não"}</Badge></td>
                      <td className="py-3 text-gray-500 text-xs">{fmtDate(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "Cotações geradas" && (
            cotacoes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Nenhuma cotação encontrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  {["Identificador", "Empresa", "Status", "Criada em"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {cotacoes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/constructor/cotacoes/${c.id}`} className="font-mono text-xs font-semibold text-[#1565C0] hover:underline">{c.identifier}</Link>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{c.company_name ?? "—"}</td>
                      <td className="py-3 pr-4"><Badge color={c.status === "Respondida" ? "green" : "gray"}>{c.status}</Badge></td>
                      <td className="py-3 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}
