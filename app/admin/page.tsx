"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  FileText, MessageSquare, TrendingUp, ShoppingCart,
  DollarSign, Building2, HardHat, Bot,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts"

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PERIODS = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
]

const MOCK_LINE = Array.from({ length: 30 }, (_, i) => ({
  dia: `${i + 1}/07`,
  geradas: Math.floor(6 + Math.random() * 14),
  respondidas: Math.floor(3 + Math.random() * 9),
}))

const MOCK_BARS = [
  { semana: "S1 Jun", volume: 48200 },
  { semana: "S2 Jun", volume: 72800 },
  { semana: "S3 Jun", volume: 61400 },
  { semana: "S4 Jun", volume: 89600 },
  { semana: "S1 Jul", volume: 55300 },
  { semana: "S2 Jul", volume: 94100 },
]

function StatCard({
  label, value, sub, icon: Icon, bg, trend, trendVal,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; bg: string
  trend?: "up" | "down"; trendVal?: string
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
      {trendVal && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
          {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{trendVal} vs. mês anterior</span>
        </div>
      )}
    </div>
  )
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

export default function AdminDashboard() {
  const [period, setPeriod] = useState("30d")
  const { data } = useSWR(`/api/admin/stats?period=${period}`, fetcher)

  // Fallback para dados mockados enquanto a API retorna dados reais
  const s = {
    cotacoes_mes: data?.cotacoes?.last30 ?? 247,
    respostas_mes: 891,
    taxa_resposta: 72,
    taxa_conversao: 38,
    volume_ocs: 1847320,
    fornecedores_ativos: data?.suppliers?.total ?? 312,
    construtores_ativos: data?.companies?.total ?? 89,
    ocs_proprio_pct: 23,
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visão consolidada — ObraPlay Fornecedor + Constructor</p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value ? "bg-[#0D1B3E] text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Cotações geradas" value={s.cotacoes_mes.toString()} sub="no período" icon={FileText} bg="bg-[#1565C0]" trend="up" trendVal="+14%" />
        <StatCard label="Respostas recebidas" value={s.respostas_mes.toString()} sub="no período" icon={MessageSquare} bg="bg-[#2E7D32]" trend="up" trendVal="+8%" />
        <StatCard label="Taxa de resposta" value={`${s.taxa_resposta}%`} sub="respondidas / enviadas" icon={TrendingUp} bg="bg-[#0277BD]" trend="up" trendVal="+3pp" />
        <StatCard label="Taxa de conversão" value={`${s.taxa_conversao}%`} sub="cotação → OC" icon={ShoppingCart} bg="bg-[#6A1B9A]" trend="down" trendVal="-2pp" />
        <StatCard label="Volume OCs" value={fmtBRL(s.volume_ocs)} sub="no período" icon={DollarSign} bg="bg-[#E65100]" trend="up" trendVal="+22%" />
        <StatCard label="Fornecedores ativos" value={s.fornecedores_ativos.toString()} sub="Obra Play Fornecedor" icon={Building2} bg="bg-[#00695C]" />
        <StatCard label="Construtores ativos" value={s.construtores_ativos.toString()} sub="empresas no banco" icon={HardHat} bg="bg-[#283593]" />
        <StatCard label="OCs Próprio" value={`${s.ocs_proprio_pct}%`} sub="autofilled=true do total" icon={Bot} bg="bg-[#AD1457]" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Cotações — geradas × respondidas (30 dias)</h2>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={MOCK_LINE} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={5} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="geradas" stroke="#1565C0" strokeWidth={2} dot={false} name="Geradas" />
              <Line type="monotone" dataKey="respondidas" stroke="#2E7D32" strokeWidth={2} dot={false} name="Respondidas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Volume de OCs por semana (R$)</h2>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={MOCK_BARS} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
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
        </div>
      </div>
    </div>
  )
}
