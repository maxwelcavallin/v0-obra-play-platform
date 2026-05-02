"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  DollarSign,
  Building2,
  Users,
  HardHat,
  Package,
  Settings,
  BarChart3,
  LogOut,
  HelpCircle,
  ChevronRight,
  Plus,
  X,
  Info,
} from "lucide-react"
import { useAuth, type Company } from "@/lib/auth-context"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Compras", href: "/cotacoes", icon: ShoppingCart },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Página institucional", href: "/institucional", icon: Building2 },
  { label: "Minha empresa", href: "/empresa", icon: HardHat },
  { label: "Histórico de preços", href: "/historico-precos", icon: BarChart3 },
  { label: "Conheça o Obra Play", href: "/sobre", icon: Info },
]

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Dúvidas frequentes", href: "/faq", icon: HelpCircle },
  { label: "Sair", href: "/sair", icon: LogOut },
]

interface SidebarContentProps {
  onClose?: () => void
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, activeCompany, companies, setActiveCompany, logout } = useAuth()
  const [companySheetOpen, setCompanySheetOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push("/login")
  }

  function handleCompanySelect(company: Company) {
    setActiveCompany(company)
    setCompanySheetOpen(false)
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <>
      {/* Header do drawer */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1565C0]">
        <div className="flex items-center gap-3">
          {/* Avatar empresa */}
          <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden relative">
            <span className="text-white font-bold text-lg">
              {activeCompany?.fantasyName?.[0] ?? initials}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {activeCompany?.fantasyName ?? user?.name ?? "Obra Play"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {user?.name ?? ""}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} className="text-white" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto" aria-label="Menu principal">
        <ul>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors group ${
                    active
                      ? "text-[#1565C0] bg-[#E3F2FD]"
                      : "text-[#424242] hover:bg-[#F4F6F8]"
                  }`}
                >
                  <Icon
                    size={20}
                    className={active ? "text-[#1565C0]" : "text-[#757575] group-hover:text-[#424242]"}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto text-xs bg-[#FF9800] text-white font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rodapé do drawer */}
      <div className="mt-auto">
        {/* Dúvidas + Sair */}
        <div className="border-t border-[#E0E0E0]">
          <Link
            href="/faq"
            onClick={onClose}
            className="flex items-center gap-3 px-5 py-3 text-[#424242] hover:bg-[#F4F6F8] transition-colors"
          >
            <HelpCircle size={20} className="text-[#757575]" />
            <span className="text-sm font-medium">Dúvidas frequentes</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-3 text-[#424242] hover:bg-[#F4F6F8] transition-colors"
          >
            <LogOut size={20} className="text-[#757575]" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>

        {/* Company switcher trigger */}
        <div className="border-t border-[#E0E0E0]">
          <button
            onClick={() => setCompanySheetOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F4F6F8] transition-colors text-left"
            aria-label="Trocar empresa"
          >
            <div className="w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {activeCompany?.fantasyName?.[0] ?? initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#1A1A2E] text-sm font-semibold truncate">
                {activeCompany?.fantasyName ?? "Selecionar empresa"}
              </p>
              {activeCompany && (
                <p className="text-[#607D8B] text-xs truncate">
                  Prestador de serviço
                </p>
              )}
            </div>
            <ChevronRight size={16} className="text-[#9E9E9E] flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet — seletor de empresa */}
      {companySheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setCompanySheetOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </div>

            <div className="px-4 pb-2">
              <p className="text-[#9E9E9E] text-xs font-medium uppercase tracking-wider">
                Trocar de conta
              </p>
            </div>

            <ul className="px-2 pb-2">
              {companies.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-[#9E9E9E]">
                  Nenhuma empresa cadastrada
                </li>
              ) : (
                companies.map((c: Company) => (
                  <li key={c.id}>
                    <button
                      onClick={() => handleCompanySelect(c)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F4F6F8] transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{c.fantasyName[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1A1A2E] text-sm font-semibold truncate">{c.fantasyName}</p>
                        <p className="text-[#607D8B] text-xs truncate">{c.city} · {c.state}</p>
                      </div>
                      {/* Radio */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          activeCompany?.id === c.id
                            ? "border-[#1565C0]"
                            : "border-[#BDBDBD]"
                        }`}
                      >
                        {activeCompany?.id === c.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
                        )}
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>

            {/* Adicionar negócio */}
            <div className="border-t border-[#F0F0F0] mx-4" />
            <button
              onClick={() => {
                setCompanySheetOpen(false)
                router.push("/onboarding")
              }}
              className="w-full flex items-center gap-3 px-5 py-4 text-[#1565C0] hover:bg-[#E3F2FD] transition-colors"
            >
              <Plus size={18} className="text-[#1565C0]" />
              <span className="text-sm font-semibold">Adicionar negócio</span>
            </button>

            {/* safe area bottom */}
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  )
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar fixo */}
      <aside className="hidden md:flex flex-col fixed top-14 left-0 bottom-0 w-[260px] bg-white border-r border-[#E0E0E0] z-40 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile drawer (overlay) */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 flex flex-col shadow-2xl md:hidden animate-in slide-in-from-left-4 duration-200 overflow-hidden">
            <SidebarContent onClose={onClose} />
          </aside>
        </>
      )}
    </>
  )
}

// Bottom Navigation for mobile
export function BottomNav() {
  const pathname = usePathname()

  const mobileItems: NavItem[] = [
    { label: "Início", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cotações", href: "/cotacoes", icon: FileText, badge: 3 },
    { label: "Financeiro", href: "/financeiro", icon: DollarSign },
    { label: "Menu", href: "#menu", icon: Settings },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] md:hidden z-40"
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {mobileItems.map((item) => {
          const Icon = item.icon
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href !== "#menu" && pathname.startsWith(item.href)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 relative ${
                  active ? "text-[#1565C0]" : "text-[#607D8B]"
                }`}
              >
                <div className="relative">
                  <Icon size={22} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 text-[10px] bg-[#FF9800] text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[#1565C0]" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
