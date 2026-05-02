"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Cotações", href: "/cotacoes", icon: FileText, badge: 3 },
  { label: "Ordens de Compra", href: "/ordens-de-compra", icon: ShoppingCart },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Obras", href: "/obras", icon: HardHat },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Insumos", href: "/insumos", icon: Package },
]

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Empresa", href: "/empresa", icon: Building2 },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col fixed top-14 left-0 bottom-0 w-[260px] bg-[#0D1B3E] z-40 overflow-y-auto">
      <nav className="flex-1 px-3 py-4" aria-label="Menu principal">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
          Principal
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                    active
                      ? "bg-[#1565C0] text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? "text-white" : "text-white/60 group-hover:text-white"}
                  />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="text-xs bg-[#FF9800] text-white font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
            Configurar
          </p>
          <ul className="flex flex-col gap-0.5">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                      active
                        ? "bg-[#1565C0] text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-white" : "text-white/60 group-hover:text-white"}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* Sidebar footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <HardHat size={16} className="text-white/40" />
          <span className="text-white/30 text-xs">OBRA PLAY Constructor</span>
        </div>
        <p className="text-white/20 text-xs mt-0.5">go.obraplay.com</p>
      </div>
    </aside>
  )
}

// Bottom Navigation for mobile
export function BottomNav() {
  const pathname = usePathname()

  const mobileItems: NavItem[] = [
    { label: "Início", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cotações", href: "/cotacoes", icon: FileText, badge: 3 },
    { label: "Financeiro", href: "/financeiro", icon: DollarSign },
    { label: "Menu", href: "/menu", icon: Settings },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] md:hidden z-50 safe-area-bottom"
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {mobileItems.map((item) => {
          const Icon = item.icon
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
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
