"use client"

import Image from "next/image"
import { Menu } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { NotificationBell } from "@/components/dashboard/notification-drawer"

interface AppBarProps {
  onMenuOpen?: () => void
}

export function AppBar({ onMenuOpen }: AppBarProps) {
  const { activeCompany } = useAuth()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#1565C0] shadow-md"
      style={{ height: 56 }}
    >
      <div className="h-full grid grid-cols-3 items-center px-2">

        {/* Coluna 1: Hambúrguer */}
        <div className="flex items-center justify-start">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            onClick={onMenuOpen}
            aria-label="Abrir menu"
          >
            <Menu size={24} className="text-white" />
          </button>
        </div>

        {/* Coluna 2: Logo centralizada */}
        <div className="flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Obra Play"
            width={200}
            height={26}
            className="w-auto"
            style={{ height: 26 }}
            priority
          />
        </div>

        {/* Coluna 3: Notificações */}
        <div className="flex items-center justify-end">
          <NotificationBell companyId={activeCompany?.id} />
        </div>
      </div>
    </header>
  )
}
