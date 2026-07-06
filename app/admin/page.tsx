"use client"

import useSWR from "swr"
import { Users, Building2, FileText, Truck, RefreshCw, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-[#EEEEEE] p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? `${accent}18` : "#F5F5F5" }}
      >
        <Icon size={18} style={{ color: accent ?? "#616161" }} />
      </div>
      <div>
        <p className="text-[11px] text-[#9E9E9E] uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#212121] leading-tight mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-xs text-[#9E9E9E] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useSWR("/api/admin/stats", fetcher, { refreshInterval: 60000 })

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#212121]">Painel Administrativo</h1>
        <p className="text-sm text-[#9E9E9E] mt-1">Visão geral da plataforma ObraPlay</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[#9E9E9E] text-sm">
          <RefreshCw size={14} className="animate-spin" /> Carregando métricas...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[#F44336] text-sm bg-[#FFEBEE] px-4 py-3 rounded-lg">
          <AlertCircle size={14} /> Erro ao carregar métricas
        </div>
      )}

      {data && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Usuários"
              value={data.users.total}
              sub={`${data.users.active} ativos`}
              icon={Users}
              accent="#1565C0"
            />
            <StatCard
              label="Empresas"
              value={data.companies.total}
              icon={Building2}
              accent="#1565C0"
            />
            <StatCard
              label="Cotações"
              value={data.cotacoes.total}
              sub={`${data.cotacoes.last30} nos últimos 30 dias`}
              icon={FileText}
              accent="#2E7D32"
            />
            <StatCard
              label="Fornecedores"
              value={data.suppliers.total}
              sub={`${data.suppliers.certified} certificados`}
              icon={Truck}
              accent="#E65100"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync ObraPlay */}
            <div className="bg-white rounded-xl border border-[#EEEEEE] p-5">
              <h2 className="text-sm font-semibold text-[#212121] mb-4 flex items-center gap-2">
                <RefreshCw size={14} className="text-[#1565C0]" />
                Sincronização ObraPlay
              </h2>
              {data.sync ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9E9E9E]">Última sync</span>
                    <span className="font-medium text-[#212121]">{fmtDate(data.sync.last_sync_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9E9E9E]">Total sincronizados</span>
                    <span className="font-medium text-[#212121]">{data.sync.total_synced ?? "—"}</span>
                  </div>
                  {data.sync.last_error && (
                    <div className="mt-3 text-xs text-[#F44336] bg-[#FFEBEE] px-3 py-2 rounded-lg">
                      {data.sync.last_error}
                    </div>
                  )}
                  {!data.sync.last_error && (
                    <div className="mt-3 text-xs text-[#2E7D32] bg-[#E8F5E9] px-3 py-2 rounded-lg">
                      Funcionando normalmente
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#9E9E9E]">Nenhuma sincronização registrada ainda.</p>
              )}
            </div>

            {/* Atividade recente */}
            <div className="bg-white rounded-xl border border-[#EEEEEE] p-5">
              <h2 className="text-sm font-semibold text-[#212121] mb-4">Atividade recente</h2>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-[#9E9E9E]">Nenhuma ação registrada ainda.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.recentActivity.map((a: {
                    action: string
                    admin_name: string
                    entity_type?: string
                    entity_id?: string
                    created_at: string
                  }, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="text-[#212121] font-medium">{a.action}</p>
                        <p className="text-[10px] text-[#9E9E9E]">
                          {a.admin_name}
                          {a.entity_type ? ` · ${a.entity_type}` : ""}
                        </p>
                      </div>
                      <p className="text-[10px] text-[#BDBDBD] whitespace-nowrap flex-shrink-0">{fmtDate(a.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
