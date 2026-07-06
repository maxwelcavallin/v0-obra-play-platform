"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  FileText,
  MessageSquare,
  ShoppingCart,
  Users,
  ClipboardList,
  UserCircle,
  HardHat,
  Package,
  Bot,
  LogOut,
  ChevronRight,
  Store,
} from "lucide-react"

const NAV_FORNECEDOR = [
  { label: "Empresas Fornecedoras",  href: "/admin/obraplay/empresas",  icon: Building2 },
  { label: "Cotações do Marketplace",href: "/admin/obraplay/cotacoes",  icon: FileText },
  { label: "Respostas de Cotação",   href: "/admin/obraplay/respostas", icon: MessageSquare },
  { label: "Ordens de Compra",       href: "/admin/obraplay/ordens",    icon: ShoppingCart },
  { label: "Membros & Usuários",     href: "/admin/obraplay/membros",   icon: Users },
  { label: "Auditoria de Credenciados", href: "/admin/obraplay/auditoria", icon: ClipboardList },
]

const NAV_CONSTRUCTOR = [
  { label: "Usuários",              href: "/admin/constructor/usuarios", icon: UserCircle },
  { label: "Empresas Construtoras", href: "/admin/constructor/empresas", icon: HardHat },
  { label: "Cotações",              href: "/admin/constructor/cotacoes", icon: FileText },
  { label: "Ordens de Compra",      href: "/admin/constructor/ordens",   icon: ShoppingCart },
  { label: "Insumos padrão",        href: "/admin/constructor/insumos",  icon: Package },
  { label: "Config Agente IA",      href: "/admin/constructor/agente",   icon: Bot },
]

function NavItem({ label, href, icon: Icon }: { label: string; href: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
        active
          ? "bg-[#1565C0] text-white"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 leading-tight">{label}</span>
      {active && <ChevronRight size={12} className="opacity-60" />}
    </Link>
  )
}

export function AdminSidebar({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  // Determina seção ativa pelo pathname
  const isFornecedor = pathname.startsWith("/admin/obraplay")
  const section = isFornecedor ? "fornecedor" : "constructor"
  const navItems = section === "fornecedor" ? NAV_FORNECEDOR : NAV_CONSTRUCTOR

  const sectionMeta = {
    fornecedor: { label: "Fornecedor", color: "text-[#FF9800]", icon: Store },
    constructor: { label: "Constructor", color: "text-[#64B5F6]", icon: HardHat },
  }
  const { label: sectionLabel, color: sectionColor, icon: SectionIcon } = sectionMeta[section]

  function switchTo(target: "fornecedor" | "constructor") {
    if (target === "fornecedor") router.push("/admin/obraplay/empresas")
    else router.push("/admin/constructor/usuarios")
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0D1B3E] flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1565C0] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-black">OP</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-none">OBRA PLAY</p>
            <span className="text-[9px] font-bold bg-[#E65100] text-white px-1.5 py-0.5 rounded mt-1 inline-block leading-none uppercase tracking-wide">
              ADMIN
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="px-3 pt-3 shrink-0">
        <NavItem label="Dashboard" href="/admin" icon={LayoutDashboard} />
      </div>

      {/* Seção ativa */}
      <div className="px-3 pt-4 flex-1">
        <div className="flex items-center gap-2 mb-2 px-1">
          <SectionIcon size={11} className={sectionColor} />
          <p className={`text-[10px] font-bold uppercase tracking-wider ${sectionColor}`}>
            ObraPlay {sectionLabel}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          {navItems.map(item => <NavItem key={item.href} {...item} />)}
        </div>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/10 shrink-0">
        <div className="px-3 py-2">
          <p className="text-white text-[12px] font-semibold truncate">{adminName}</p>
          <p className="text-white/40 text-[10px] truncate mt-0.5">{adminEmail}</p>
        </div>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={14} />
          <span>Sair</span>
        </a>
      </div>
    </aside>
  )
}
