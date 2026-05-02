"use client"

import { FileText, ShoppingCart, DollarSign, TrendingUp, Plus, ArrowUpRight, Clock } from "lucide-react"
import Link from "next/link"

// --- Mock data ---
const MOCK_METRICS = [
  {
    label: "Cotações ativas",
    value: "7",
    change: "+2 esta semana",
    positive: true,
    icon: FileText,
    color: "#1565C0",
    bg: "#E3F2FD",
  },
  {
    label: "OCs pendentes",
    value: "3",
    change: "1 vence amanhã",
    positive: null,
    icon: ShoppingCart,
    color: "#FF9800",
    bg: "#FFF3E0",
  },
  {
    label: "A pagar este mês",
    value: "R$ 48.750",
    change: "3 vencimentos",
    positive: null,
    icon: DollarSign,
    color: "#F44336",
    bg: "#FFEBEE",
  },
  {
    label: "Receita do mês",
    value: "R$ 120.000",
    change: "+12% vs mês anterior",
    positive: true,
    icon: TrendingUp,
    color: "#4CAF50",
    bg: "#E8F5E9",
  },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: "Nova",               color: "#1565C0", bg: "#E3F2FD" },
  answered:  { label: "Respondida",         color: "#4CAF50", bg: "#E8F5E9" },
  pending:   { label: "Pendente revisão",   color: "#FF9800", bg: "#FFF3E0" },
  converted: { label: "Convertida",         color: "#2E7D32", bg: "#E8F5E9" },
  partial:   { label: "Parcialmente conv.", color: "#42A5F5", bg: "#E3F2FD" },
  canceled:  { label: "Cancelada",          color: "#F44336", bg: "#FFEBEE" },
  expired:   { label: "Expirada",           color: "#607D8B", bg: "#ECEFF1" },
}

const MOCK_QUOTATIONS = [
  {
    id: "COT-2024-007",
    obra: "Residência João Pizzini",
    cliente: "João Pizzini",
    cidade: "Curitiba · PR",
    status: "answered",
    itens: 12,
    date: "28/04/2025",
    expires: "10/05/2025",
  },
  {
    id: "COT-2024-006",
    obra: "Edifício Comercial Centro",
    cliente: "Empresa XYZ Ltda",
    cidade: "São José dos Pinhais · PR",
    status: "new",
    itens: 8,
    date: "25/04/2025",
    expires: "05/05/2025",
  },
  {
    id: "COT-2024-005",
    obra: "Reforma Sobrado Batel",
    cliente: "Maria Silva",
    cidade: "Curitiba · PR",
    status: "pending",
    itens: 5,
    date: "22/04/2025",
    expires: "02/05/2025",
  },
  {
    id: "COT-2024-004",
    obra: "Galpão Industrial Zona Norte",
    cliente: "LogTech S.A.",
    cidade: "Colombo · PR",
    status: "converted",
    itens: 20,
    date: "18/04/2025",
    expires: "28/04/2025",
  },
]

const MOCK_FINANCIALS = [
  {
    id: "LC-001",
    description: "Compra OC-ZMSDNDL — Cimento e Areia Ltda",
    obra: "Residência João Pizzini",
    value: "R$ 15.200,00",
    due: "30/04/2025",
    status: "overdue",
    daysLabel: "2 dias atrasado",
  },
  {
    id: "LC-002",
    description: "Mão de obra — Pedreiros",
    obra: "Edifício Comercial Centro",
    value: "R$ 8.500,00",
    due: "05/05/2025",
    status: "pending",
    daysLabel: "Vence em 5 dias",
  },
  {
    id: "LC-003",
    description: "Compra OC-ABCDEF — Hidráulica Norte",
    obra: "Reforma Sobrado Batel",
    value: "R$ 3.750,00",
    due: "08/05/2025",
    status: "pending",
    daysLabel: "Vence em 8 dias",
  },
]

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

export default function DashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Início</h1>
          <p className="text-[#607D8B] text-sm mt-0.5">Visão geral da sua empresa</p>
        </div>
        <Link
          href="/cotacoes/nova"
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D1B3E] transition-all"
        >
          <Plus size={16} />
          Nova cotação
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {MOCK_METRICS.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm border border-[#E0E0E0]/50">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: m.bg }}
                >
                  <Icon size={18} style={{ color: m.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1A1A2E]">{m.value}</p>
              <p className="text-[#607D8B] text-xs mt-0.5 leading-tight">{m.label}</p>
              <p
                className="text-xs mt-1 font-medium"
                style={{ color: m.positive === true ? "#4CAF50" : m.positive === false ? "#F44336" : "#FF9800" }}
              >
                {m.change}
              </p>
            </div>
          )
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Últimas cotações — 2/3 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0]/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F8]">
              <div>
                <h2 className="font-bold text-[#1A1A2E] text-base">Últimas cotações</h2>
                <p className="text-[#607D8B] text-xs">Suas cotações mais recentes</p>
              </div>
              <Link
                href="/cotacoes"
                className="flex items-center gap-1 text-xs text-[#1565C0] hover:text-[#0D1B3E] font-medium transition-colors"
              >
                Ver todas <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-[#F4F6F8]">
              {MOCK_QUOTATIONS.map((q) => (
                <Link
                  key={q.id}
                  href={`/cotacoes/${q.id}`}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-[#F8FAFE] transition-colors block"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-[#607D8B]">{q.id}</span>
                      <StatusChip status={q.status} />
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A2E] mt-1 truncate">{q.obra}</p>
                    <p className="text-xs text-[#607D8B] truncate">{q.cliente} · {q.cidade}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[#607D8B]">{q.itens} itens</p>
                    <p className="text-xs text-[#B0BEC5] mt-0.5">Vence {q.expires}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#F4F6F8]">
              <Link
                href="/cotacoes/nova"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-[#E0E0E0] text-[#607D8B] text-sm hover:border-[#1565C0] hover:text-[#1565C0] transition-all"
              >
                <Plus size={16} />
                Nova cotação
              </Link>
            </div>
          </div>
        </div>

        {/* Pendências financeiras — 1/3 */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0]/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F6F8]">
              <div>
                <h2 className="font-bold text-[#1A1A2E] text-base">Pendências</h2>
                <p className="text-[#607D8B] text-xs">Vencimentos próximos</p>
              </div>
              <Link
                href="/financeiro"
                className="flex items-center gap-1 text-xs text-[#1565C0] font-medium hover:text-[#0D1B3E] transition-colors"
              >
                Ver tudo <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-[#F4F6F8]">
              {MOCK_FINANCIALS.map((lc) => (
                <div key={lc.id} className="px-5 py-4">
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        lc.status === "overdue" ? "bg-[#F44336]" : "bg-[#FF9800]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A2E] truncate leading-tight">
                        {lc.description}
                      </p>
                      <p className="text-xs text-[#607D8B] truncate mt-0.5">{lc.obra}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-sm font-bold text-[#1A1A2E]">{lc.value}</p>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${
                            lc.status === "overdue" ? "text-[#F44336]" : "text-[#FF9800]"
                          }`}
                        >
                          <Clock size={11} />
                          {lc.daysLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#F4F6F8]">
              <Link
                href="/financeiro/novo"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-[#E0E0E0] text-[#607D8B] text-sm hover:border-[#1565C0] hover:text-[#1565C0] transition-all"
              >
                <Plus size={16} />
                Novo lançamento
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <Link
        href="/cotacoes/nova"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#1565C0] text-white flex items-center justify-center shadow-xl md:hidden hover:bg-[#0D1B3E] transition-all active:scale-95"
        aria-label="Nova cotação"
      >
        <Plus size={24} />
      </Link>
    </div>
  )
}
