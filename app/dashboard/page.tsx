"use client"

import {
  FileText,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Plus,
  Clock,
  ChevronRight,
  Building2,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

// --- Status config ---
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:       { label: "Nova",               cls: "op-chip op-chip-primary" },
  answered:  { label: "Respondida",         cls: "op-chip op-chip-success" },
  pending:   { label: "Pendente revisão",   cls: "op-chip op-chip-warning" },
  converted: { label: "Convertida",         cls: "op-chip op-chip-success" },
  partial:   { label: "Parcialmente conv.", cls: "op-chip op-chip-primary" },
  canceled:  { label: "Cancelada",          cls: "op-chip op-chip-error" },
  expired:   { label: "Expirada",           cls: "op-chip op-chip-neutral" },
}

// --- Mock data ---
const MOCK_QUOTATIONS = [
  {
    id: "COT-2024-007",
    obra: "Residência João Pizzini",
    cliente: "João Pizzini",
    cidade: "Curitiba · PR",
    status: "answered",
    itens: 12,
    expires: "10/05/2025",
  },
  {
    id: "COT-2024-006",
    obra: "Edifício Comercial Centro",
    cliente: "Empresa XYZ Ltda",
    cidade: "São José dos Pinhais · PR",
    status: "new",
    itens: 8,
    expires: "05/05/2025",
  },
  {
    id: "COT-2024-005",
    obra: "Reforma Sobrado Batel",
    cliente: "Maria Silva",
    cidade: "Curitiba · PR",
    status: "pending",
    itens: 5,
    expires: "02/05/2025",
  },
  {
    id: "COT-2024-004",
    obra: "Galpão Industrial Zona Norte",
    cliente: "LogTech S.A.",
    cidade: "Colombo · PR",
    status: "converted",
    itens: 20,
    expires: "28/04/2025",
  },
]

const MOCK_FINANCIALS = [
  {
    id: "LC-001",
    description: "Compra OC-ZMSDNDL — Cimento e Areia Ltda",
    obra: "Residência João Pizzini",
    value: "R$ 15.200,00",
    status: "overdue",
    daysLabel: "2 dias atrasado",
  },
  {
    id: "LC-002",
    description: "Mão de obra — Pedreiros",
    obra: "Edifício Comercial Centro",
    value: "R$ 8.500,00",
    status: "pending",
    daysLabel: "Vence em 5 dias",
  },
  {
    id: "LC-003",
    description: "Compra OC-ABCDEF — Hidráulica Norte",
    obra: "Reforma Sobrado Batel",
    value: "R$ 3.750,00",
    status: "pending",
    daysLabel: "Vence em 8 dias",
  },
]

// Atalhos rápidos — estilo círculos azuis com ícone branco
const QUICK_ACTIONS = [
  { label: "Cotações",    href: "/cotacoes",  icon: FileText },
  { label: "Financeiro",  href: "/financeiro", icon: DollarSign },
  { label: "Minhas obras",href: "/obras",      icon: Building2 },
  { label: "Configurar",  href: "/configuracoes", icon: Settings },
]

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new
  return <span className={cfg.cls}>{cfg.label}</span>
}

export default function DashboardPage() {
  const { user, activeCompany } = useAuth()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <div className="op-page-bg min-h-full">

      {/* Cabeçalho hero — fundo azul estendido (padrão home Obra Play) */}
      <div className="bg-[#1565C0] px-5 pt-5 pb-8">
        <div className="flex items-center gap-4">
          {/* Avatar empresa */}
          <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <span className="text-white font-bold text-xl">
              {activeCompany?.fantasyName?.[0] ?? initials}
            </span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">
              {activeCompany?.fantasyName ?? "Obra Play"}
            </p>
            <p className="text-white/70 text-sm mt-0.5">
              {user?.name ?? "Bem-vindo"}
            </p>
          </div>
        </div>
      </div>

      {/* Atalhos rápidos (círculos azuis) — sobrepostos ao hero */}
      <div className="bg-white mx-4 -mt-5 rounded-xl shadow-sm px-4 py-5">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="op-icon-circle group-hover:opacity-80 transition-opacity">
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-[11px] text-[#757575] text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="px-4 mt-4 pb-24 flex flex-col gap-4">

        {/* Saldo geral */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-[#757575] mb-0.5">Saldo geral</p>
          <p className="text-2xl font-bold text-[#212121]">R$ 59.256,32</p>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-xs text-[#9E9E9E]">Receitas</p>
              <p className="text-sm font-bold text-[#4CAF50]">R$ 9.625,76</p>
            </div>
            <div>
              <p className="text-xs text-[#9E9E9E]">Despesas</p>
              <p className="text-sm font-bold text-[#F44336]">- R$ 7.625,76</p>
            </div>
            <div>
              <p className="text-xs text-[#9E9E9E]">Saldo</p>
              <p className="text-sm font-bold text-[#1565C0]">R$ 925,76</p>
            </div>
          </div>
        </div>

        {/* Últimas cotações */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Últimas cotações</p>
            <Link
              href="/cotacoes"
              className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium"
            >
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {MOCK_QUOTATIONS.map((q, idx) => (
            <Link
              key={q.id}
              href={`/cotacoes/${q.id}`}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F9F9F9] transition-colors block ${
                idx < MOCK_QUOTATIONS.length - 1 ? "border-b border-[#EEEEEE]" : ""
              }`}
            >
              {/* Ícone de cotação */}
              <div className="op-icon-circle-sm flex-shrink-0 mt-0.5">
                <FileText size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#212121] truncate">{q.obra}</p>
                <p className="text-xs text-[#9E9E9E] truncate">{q.cliente}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusChip status={q.status} />
                  <span className="text-xs text-[#9E9E9E]">{q.itens} itens</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-[#9E9E9E]">Vence</p>
                <p className="text-xs text-[#757575]">{q.expires}</p>
              </div>
            </Link>
          ))}

          <div className="px-4 py-3 border-t border-[#EEEEEE]">
            <Link
              href="/cotacoes/nova"
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#E0E0E0] text-sm text-[#1565C0] hover:bg-[#E3F2FD] transition-colors"
            >
              <Plus size={16} />
              Nova cotação
            </Link>
          </div>
        </div>

        {/* Histórico de transações */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Link
            href="/financeiro/historico"
            className="flex items-center justify-between px-4 py-4 hover:bg-[#F9F9F9] transition-colors"
          >
            <div>
              <p className="text-[#1565C0] font-semibold text-sm">Histórico de transações</p>
              <p className="text-xs text-[#9E9E9E] mt-0.5">Toque aqui para acessar o histórico de transações de suas contas.</p>
            </div>
            <ChevronRight size={18} className="text-[#9E9E9E] flex-shrink-0" />
          </Link>
        </div>

        {/* Pendências financeiras */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Pendências</p>
            <Link
              href="/financeiro"
              className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium"
            >
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>

          {MOCK_FINANCIALS.map((lc, idx) => (
            <div
              key={lc.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                idx < MOCK_FINANCIALS.length - 1 ? "border-b border-[#EEEEEE]" : ""
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  lc.status === "overdue" ? "bg-[#F44336]" : "bg-[#FF9800]"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#212121] truncate leading-snug">
                  {lc.description}
                </p>
                <p className="text-xs text-[#9E9E9E] truncate mt-0.5">{lc.obra}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-sm font-bold text-[#212121]">{lc.value}</p>
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
          ))}
        </div>

        {/* Minhas obras preview */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Minhas obras</p>
            <Link
              href="/obras"
              className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium"
            >
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>
          {[
            { name: "Meio Terreno", responsavel: "Lucas Silva", value: "R$ 58.563,63" },
            { name: "Meio Terreno", responsavel: "Leonardo", value: "R$ 8.563,63" },
            { name: "Meio Terreno", responsavel: "Marcia Leão", value: "R$ 105.542,44" },
          ].map((obra, idx, arr) => (
            <div
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx < arr.length - 1 ? "border-b border-[#EEEEEE]" : ""
              }`}
            >
              <div className="op-icon-circle-sm flex-shrink-0">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#212121]">{obra.name}</p>
                <p className="text-xs text-[#9E9E9E]">{obra.responsavel}</p>
              </div>
              <p className="text-sm font-bold text-[#4CAF50] flex-shrink-0">{obra.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAB mobile */}
      <Link
        href="/cotacoes/nova"
        className="op-fab fixed bottom-20 right-4 md:hidden"
        aria-label="Nova cotação"
      >
        <Plus size={24} />
      </Link>
    </div>
  )
}
