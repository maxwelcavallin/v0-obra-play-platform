"use client"

import useSWR from "swr"
import {
  FileText, MessageSquare, TrendingUp, ShoppingCart,
  DollarSign, Building2, HardHat, RefreshCw,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

function StatCard({
  label, value, sub, icon: Icon, bg,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; bg: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    activate_user: "text-green-700 bg-green-50",
    deactivate_user: "text-red-700 bg-red-50",
    activate_company: "text-green-700 bg-green-50",
    deactivate_company: "text-red-700 bg-red-50",
    sync_suppliers: "text-blue-700 bg-blue-50",
  }
  const cls = colors[action] ?? "text-gray-600 bg-gray-50"
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useSWR("/api/admin/stats", fetcher)
  const { data: charts, isLoading: loadingCharts } = useSWR("/api/admin/charts", fetcher)

  const lineData = charts?.lineData ?? []
  const volumeOCs = charts?.volumeOCs ?? []
  const recentActivity = stats?.recentActivity ?? []

  const cotacoesMes   = stats?.cotacoes?.last30 ?? "—"
  const suppliersTotal = stats?.suppliers?.total ?? "—"
  const suppliersCert  = stats?.suppliers?.certified ?? "—"
  const companiesTotal = stats?.companies?.total ?? "—"
  const usersTotal     = stats?.users?.total ?? "—"
  const usersActive    = stats?.users?.active ?? "—"

  // Volume total OCs do período
  const volumeTotal = volumeOCs.reduce((acc: number, r: { volume: number }) => acc + (Number(r.volume) || 0), 0)

  // Taxa de resposta baseada nos dados reais
  const cotacoesGeradas   = lineData.reduce((a: number, r: { geradas: number }) => a + (r.geradas || 0), 0)
  const cotacoesRespondidas = lineData.reduce((a: number, r: { respondidas: number }) => a + (r.respondidas || 0), 0)
  const taxaResposta = cotacoesGeradas > 0 ? Math.round((cotacoesRespondidas / cotacoesGeradas) * 100) : 0

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão consolidada — ObraPlay Fornecedor + Constructor</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Cotações (30 dias)" value={cotacoesMes} sub="geradas no período" icon={FileText} bg="bg-[#1565C0]" />
        <StatCard label="Respostas (30 dias)" value={cotacoesRespondidas} sub="no período" icon={MessageSquare} bg="bg-[#2E7D32]" />
        <StatCard label="Taxa de resposta" value={`${taxaResposta}%`} sub="respondidas / geradas" icon={TrendingUp} bg="bg-[#0277BD]" />
        <StatCard label="Volume OCs" value={fmtBRL(volumeTotal)} sub="últimas 8 semanas" icon={DollarSign} bg="bg-[#E65100]" />
        <StatCard label="Fornecedores" value={suppliersTotal} sub={`${suppliersCert} credenciados`} icon={Building2} bg="bg-[#00695C]" />
        <StatCard label="Construtoras" value={companiesTotal} sub="empresas cadastradas" icon={HardHat} bg="bg-[#283593]" />
        <StatCard label="Usuários" value={usersTotal} sub={`${usersActive} ativos`} icon={ShoppingCart} bg="bg-[#6A1B9A]" />
        <StatCard label="Sync Fornecedores" value={stats?.sync?.last_sync_at ? new Date(stats.sync.last_sync_at).toLocaleDateString("pt-BR") : "—"} sub={stats?.sync?.total_synced ? `${stats.sync.total_synced} sincronizados` : "Nunca sincronizado"} icon={RefreshCw} bg="bg-[#AD1457]" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Cotações — geradas × respondidas (30 dias)</h2>
          {loadingCharts ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-gray-400">Carregando...</div>
          ) : lineData.length === 0 ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-gray-400">Sem dados no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={lineData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={Math.floor(lineData.length / 6)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="geradas" stroke="#1565C0" strokeWidth={2} dot={false} name="Geradas" />
                <Line type="monotone" dataKey="respondidas" stroke="#2E7D32" strokeWidth={2} dot={false} name="Respondidas" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Volume de OCs por semana (R$)</h2>
          {loadingCharts ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-gray-400">Carregando...</div>
          ) : volumeOCs.length === 0 ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-gray-400">Sem ordens de compra no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={volumeOCs} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(v: number) => [fmtBRL(v), "Volume"]}
                />
                <Bar dataKey="volume" fill="#1565C0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Atividade recente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Atividade recente (auditoria)</h2>
        {loadingStats ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma ação registrada ainda.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentActivity.map((log: { action: string; admin_name: string; entity_type: string; entity_id: string; created_at: string }, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <ActionBadge action={log.action} />
                  <span className="text-sm text-gray-700">{log.admin_name}</span>
                  {log.entity_type && (
                    <span className="text-xs text-gray-400">{log.entity_type} {log.entity_id}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/auditoria" className="text-xs text-[#1565C0] font-medium mt-3 block hover:underline">
          Ver log completo
        </Link>
      </div>
    </div>
  )
}
