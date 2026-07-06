"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  ShoppingBag,
  ClipboardList,
  LogOut,
  ChevronRight,
} from "lucide-react"

const NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  { label: "Empresas", href: "/admin/empresas", icon: Building2 },
  { label: "Fornecedores", href: "/admin/fornecedores", icon: Truck },
  { label: "Vitrine", href: "/admin/vitrine", icon: ShoppingBag },
  { label: "Auditoria", href: "/admin/auditoria", icon: ClipboardList },
]

export function AdminSidebar({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#0F1923] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1565C0] flex items-center justify-center">
            <span className="text-white text-xs font-black">OP</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-none">ObraPlay</p>
            <p className="text-white/40 text-[10px] leading-none mt-0.5">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#1565C0] text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} className="opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2.5 rounded-lg">
          <p className="text-white text-xs font-semibold truncate">{adminName}</p>
          <p className="text-white/40 text-[10px] truncate mt-0.5">{adminEmail}</p>
        </div>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors mt-0.5"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </a>
      </div>
    </aside>
  )
}
