"use client"

import { useState } from "react"
import { Bell, Menu, HelpCircle, UserCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import Link from "next/link"

interface AppBarProps {
  onMenuOpen?: () => void
}

export function AppBar({ onMenuOpen }: AppBarProps) {
  const { user } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-[#1565C0] shadow-md"
      style={{ height: 56 }}
    >
      {/* Grid exato do HTML original: 3 colunas iguais */}
      <div className="h-full grid grid-cols-3 items-center px-2">

        {/* Coluna 1: Hambúrguer (mobile) / vazio (desktop) */}
        <div className="flex items-center justify-start">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors md:hidden"
            onClick={onMenuOpen}
            aria-label="Abrir menu"
          >
            <Menu size={24} className="text-white" />
          </button>
        </div>

        {/* Coluna 2: Logo centralizado */}
        {/* Medida exata do HTML: width=200 height=26 */}
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

        {/* Coluna 3: Perfil + Ajuda + Notificações */}
        <div className="flex items-center justify-end gap-0.5">
          <Link
            href="/dashboard/perfil"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Meu perfil"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="perfil" className="w-7 h-7 rounded-full object-cover border-2 border-white/50" />
            ) : (
              <UserCircle size={22} className="text-white" />
            )}
          </Link>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Ajuda"
          >
            <HelpCircle size={22} className="text-white" />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Notificações"
            >
              <Bell size={22} className="text-white" />
              <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-[#FF3D00] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                1
              </span>
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-[#E0E0E0] z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#EEEEEE] flex items-center justify-between">
                  <span className="font-semibold text-[#212121] text-sm">Notificações</span>
                  <span className="text-xs bg-[#FF9800] text-white px-2 py-0.5 rounded-full font-bold">2</span>
                </div>
                <div className="divide-y divide-[#EEEEEE]">
                  <div className="px-4 py-3">
                    <p className="text-sm text-[#212121] font-medium">Cotação respondida</p>
                    <p className="text-xs text-[#757575] mt-0.5">Fornecedor respondeu a cotação #COT-2024-001</p>
                    <p className="text-xs text-[#9E9E9E] mt-1">2 horas atrás</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-[#212121] font-medium">Vencimento próximo</p>
                    <p className="text-xs text-[#757575] mt-0.5">OC-ZMSDNDL vence em 2 dias</p>
                    <p className="text-xs text-[#9E9E9E] mt-1">5 horas atrás</p>
                  </div>
                </div>
                <div className="px-4 py-2.5 border-t border-[#EEEEEE]">
                  <button className="text-xs text-[#1565C0] font-medium hover:underline w-full text-center">
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
    </header>
  )
}
