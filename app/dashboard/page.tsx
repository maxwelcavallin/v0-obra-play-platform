"use client"

import {
  FileText,
  DollarSign,
  Plus,
  Clock,
  ChevronRight,
  Building2,
  Settings,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/lib/auth-context"

// --- Helpers ---
const fetcher = (url: string) => fetch(url).then(r => r.json())

function fmtBRL(value: number | string) {
  const n = Number(value ?? 0)
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR")
}

function daysLabel(dueDateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dueDateStr); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? "s" : ""} atrasado`, overdue: true }
  if (diff === 0) return { label: "Vence hoje", overdue: false }
  return { label: `Vence em ${diff} dia${diff !== 1 ? "s" : ""}`, overdue: false }
}

// --- Status ---
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Enviada:      { label: "Enviada",            cls: "op-chip op-chip-primary" },
  Respondida:   { label: "Respondida",         cls: "op-chip op-chip-success" },
  Rascunho:     { label: "Rascunho",           cls: "op-chip op-chip-neutral" },
  Cancelada:    { label: "Cancelada",          cls: "op-chip op-chip-error" },
  Expirada:     { label: "Expirada",           cls: "op-chip op-chip-neutral" },
}

// --- Atalhos rápidos ---
const QUICK_ACTIONS = [
  { label: "Cotações",     href: "/dashboard/cotacoes",                    icon: FileText,  tour: "tour-cotacoes"  },
  { label: "Financeiro",   href: "/dashboard/financeiro",                  icon: DollarSign,tour: "tour-financeiro" },
  { label: "Minhas obras", href: "/dashboard/obras",                       icon: Building2, tour: "tour-obras"      },
  { label: "Configurar",   href: "/dashboard/empresas",                    icon: Settings,  tour: ""               },
]

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "op-chip op-chip-primary" }
  return <span className={cfg.cls}>{cfg.label}</span>
}

export default function DashboardPage() {
  const { user, activeCompany } = useAuth()
  const [balanceVisible, setBalanceVisible] = useState(false)

  const companyId = activeCompany?.id ?? null

  // --- Dados financeiros (dashboard) ---
  const { data: finData, isLoading: finLoading } = useSWR(
    companyId ? `/api/financeiro/relatorios?tipo=dashboard&company_id=${companyId}` : null,
    fetcher
  )

  // --- Últimas cotações ---
  const { data: cotData, isLoading: cotLoading } = useSWR(
    companyId ? `/api/cotacoes?company_id=${companyId}` : null,
    fetcher
  )

  // --- Obras recentes ---
  const { data: obrasData, isLoading: obrasLoading } = useSWR(
    companyId ? `/api/obras?company_id=${companyId}` : null,
    fetcher
  )

  const summary  = finData?.summary  ?? null
  const vencimentos: any[] = finData?.vencimentos ?? []
  const cotacoes: any[] = Array.isArray(cotData) ? cotData.slice(0, 4) : []
  const obras: any[]    = Array.isArray(obrasData) ? obrasData.slice(0, 3) : []

  const saldoAtual   = Number(summary?.saldo_atual      ?? 0)
  const receitasMes  = Number(summary?.receitas_pagas   ?? 0)
  const despesasMes  = Number(summary?.despesas_pagas   ?? 0)
  const resultadoMes = receitasMes - despesasMes

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <div className="op-page-bg min-h-full">

      {/* Hero azul */}
      <div className="bg-[#1565C0] px-3 pt-4 pb-8">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
            <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
              {activeCompany?.logoUrl ? (
                <img src={activeCompany.logoUrl} alt={activeCompany.fantasyName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#1565C0] font-bold text-2xl leading-none">
                  {(activeCompany?.fantasyName?.[0] ?? "O").toUpperCase()}
                </span>
              )}
            </div>
            <div
              className="absolute -bottom-1 -right-1 rounded-full bg-white border-2 border-[#1565C0] overflow-hidden flex items-center justify-center shadow"
              style={{ width: 26, height: 26 }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#1565C0] font-bold leading-none" style={{ fontSize: 10 }}>{initials}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight truncate">
              {activeCompany?.fantasyName ?? "Obra Play"}
            </p>
            <p className="text-white/80 text-sm mt-0.5 truncate">{user?.name ?? "Bem-vindo"}</p>
          </div>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="bg-white mx-2 -mt-5 rounded-xl shadow-sm px-3 py-4">
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 group"
                {...(item.tour ? { "data-tour": item.tour } : {})}
              >
                <div className="op-icon-circle group-hover:opacity-80 transition-opacity">
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-[11px] text-[#757575] text-center leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="px-2 mt-3 pb-6 flex flex-col gap-3">

        {/* Saldo geral */}
        <div className="bg-white rounded-xl shadow-sm p-3">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm text-[#757575]">Saldo geral</p>
            <button
              onClick={() => setBalanceVisible((v) => !v)}
              className="text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
              aria-label={balanceVisible ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {balanceVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            {finLoading && <Loader2 size={14} className="animate-spin text-[#9E9E9E]" />}
          </div>
          <p className="text-2xl font-bold text-[#212121]">
            {balanceVisible ? fmtBRL(saldoAtual) : "R$ ••••••"}
          </p>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-xs text-[#9E9E9E]">Receitas</p>
              <p className="text-sm font-bold text-[#4CAF50]">
                {balanceVisible ? fmtBRL(receitasMes) : "R$ •••"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9E9E9E]">Despesas</p>
              <p className="text-sm font-bold text-[#F44336]">
                {balanceVisible ? fmtBRL(despesasMes) : "R$ •••"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9E9E9E]">Resultado</p>
              <p className={`text-sm font-bold ${resultadoMes >= 0 ? "text-[#4CAF50]" : "text-[#F44336]"}`}>
                {balanceVisible ? fmtBRL(resultadoMes) : "R$ •••"}
              </p>
            </div>
          </div>
        </div>

        {/* Últimas cotações */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Últimas cotações</p>
            <Link href="/dashboard/cotacoes" className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {cotLoading && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#9E9E9E]" />
            </div>
          )}

          {!cotLoading && cotacoes.length === 0 && (
            <p className="px-3 py-5 text-sm text-[#9E9E9E] text-center">Nenhuma cotação ainda.</p>
          )}

          {cotacoes.map((q: any, idx: number) => (
            <Link
              key={q.id}
              href={`/dashboard/cotacoes/${q.id}`}
              className={`flex items-start gap-3 px-3 py-2.5 hover:bg-[#F9F9F9] transition-colors block ${
                idx < cotacoes.length - 1 ? "border-b border-[#EEEEEE]" : ""
              }`}
            >
              <div className="op-icon-circle-sm flex-shrink-0 mt-0.5">
                <FileText size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#212121] truncate">
                  {q.obra_name ?? q.identifier ?? "—"}
                </p>
                <p className="text-xs text-[#9E9E9E] truncate">{q.identifier}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusChip status={q.status} />
                  <span className="text-xs text-[#9E9E9E]">{q.item_count ?? 0} itens</span>
                </div>
              </div>
              {q.expiry_date && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[#9E9E9E]">Vence</p>
                  <p className="text-xs text-[#757575]">{fmtDate(q.expiry_date)}</p>
                </div>
              )}
            </Link>
          ))}

          <div className="px-3 py-2.5 border-t border-[#EEEEEE]">
            <Link
              href="/dashboard/cotacoes/nova"
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
            href="/dashboard/financeiro/lancamentos"
            className="flex items-center justify-between px-3 py-3 hover:bg-[#F9F9F9] transition-colors"
          >
            <div>
              <p className="text-[#1565C0] font-semibold text-sm">Histórico de transações</p>
              <p className="text-xs text-[#9E9E9E] mt-0.5">Toque aqui para acessar o histórico de transações de suas contas.</p>
            </div>
            <ChevronRight size={18} className="text-[#9E9E9E] flex-shrink-0" />
          </Link>
        </div>

        {/* Próximos vencimentos */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Próximos vencimentos</p>
            <Link href="/dashboard/financeiro/lancamentos" className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium">
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>

          {finLoading && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#9E9E9E]" />
            </div>
          )}

          {!finLoading && vencimentos.length === 0 && (
            <p className="px-3 py-5 text-sm text-[#9E9E9E] text-center">Sem pendências.</p>
          )}

          {vencimentos.map((t: any, idx: number) => {
            const { label, overdue } = daysLabel(t.due_date)
            return (
              <Link
                key={t.id}
                href={`/dashboard/financeiro/lancamentos/${t.id}`}
                className={`flex items-start gap-3 px-3 py-2.5 hover:bg-[#F9F9F9] transition-colors ${
                  idx < vencimentos.length - 1 ? "border-b border-[#EEEEEE]" : ""
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${overdue ? "bg-[#F44336]" : "bg-[#FF9800]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#212121] truncate leading-snug">{t.description}</p>
                  {t.category_name && (
                    <p className="text-xs text-[#9E9E9E] truncate mt-0.5">{t.category_name}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm font-bold text-[#212121]">{fmtBRL(t.amount)}</p>
                    <div className={`flex items-center gap-1 text-xs font-medium ${overdue ? "text-[#F44336]" : "text-[#FF9800]"}`}>
                      <Clock size={11} />
                      {label}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Minhas obras */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#EEEEEE]">
            <p className="op-section-title text-base">Minhas obras</p>
            <Link href="/dashboard/obras" className="flex items-center gap-0.5 text-sm text-[#1565C0] font-medium">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>

          {obrasLoading && (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#9E9E9E]" />
            </div>
          )}

          {!obrasLoading && obras.length === 0 && (
            <p className="px-3 py-5 text-sm text-[#9E9E9E] text-center">Nenhuma obra cadastrada.</p>
          )}

          {obras.map((obra: any, idx: number) => (
            <Link
              key={obra.id}
              href={`/dashboard/obras/${obra.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 hover:bg-[#F9F9F9] transition-colors ${
                idx < obras.length - 1 ? "border-b border-[#EEEEEE]" : ""
              }`}
            >
              <div className="op-icon-circle-sm flex-shrink-0">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#212121] truncate">{obra.name}</p>
                <p className="text-xs text-[#9E9E9E] truncate">
                  {obra.client_name_pf ?? obra.client_name_pj ?? obra.delivery_city ?? "Obra própria"}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                obra.status === "Em andamento" ? "bg-[#E8F5E9] text-[#2E7D32]" :
                obra.status === "Concluída"   ? "bg-[#EDE7F6] text-[#5E35B1]" :
                "bg-[#E3F2FD] text-[#1565C0]"
              }`}>
                {obra.status ?? "—"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB mobile */}
      <Link
        href="/dashboard/cotacoes/nova"
        className="op-fab fixed bottom-20 right-4 md:hidden"
        aria-label="Nova cotação"
      >
        <Plus size={24} />
      </Link>
    </div>
  )
}
