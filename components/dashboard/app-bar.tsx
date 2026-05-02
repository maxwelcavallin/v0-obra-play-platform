"use client"

import { useState } from "react"
import { Bell, Menu, HelpCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

interface AppBarProps {
  onMenuOpen?: () => void
}

export function AppBar({ onMenuOpen }: AppBarProps) {
  const { } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#1565C0] flex items-center px-4 gap-3 shadow-md">
      {/* Hamburger (mobile only) */}
      <button
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors md:hidden"
        onClick={onMenuOpen}
        aria-label="Abrir menu"
      >
        <Menu size={22} className="text-white" />
      </button>

      {/* Logo centralizado */}
      <div className="flex-1 flex items-center justify-center md:justify-start md:flex-none md:ml-2">
        <Image
          src="/logo.svg"
          alt="Obra Play"
          width={140}
          height={22}
          className="h-7 w-auto"
          priority
        />
      </div>

      {/* Ações à direita */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Ajuda */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Ajuda"
        >
          <HelpCircle size={20} className="text-white" />
        </button>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Notificações"
          >
            <Bell size={20} className="text-white" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FF9800] text-white text-[9px] font-bold flex items-center justify-center">
              9
            </span>
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-[#E0E0E0] z-50">
              <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between">
                <span className="font-semibold text-[#1A1A2E] text-sm">Notificações</span>
                <span className="text-xs bg-[#FF9800] text-white px-1.5 py-0.5 rounded-full">2</span>
              </div>
              <div className="divide-y divide-[#F4F6F8]">
                <div className="px-4 py-3">
                  <p className="text-sm text-[#1A1A2E] font-medium">Cotação respondida</p>
                  <p className="text-xs text-[#607D8B] mt-0.5">Fornecedor respondeu a cotação #COT-2024-001</p>
                  <p className="text-xs text-[#B0BEC5] mt-1">2 horas atrás</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-[#1A1A2E] font-medium">Vencimento próximo</p>
                  <p className="text-xs text-[#607D8B] mt-0.5">OC-ZMSDNDL vence em 2 dias</p>
                  <p className="text-xs text-[#B0BEC5] mt-1">5 horas atrás</p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-[#E0E0E0]">
                <button className="text-xs text-[#1565C0] hover:underline w-full text-center">
                  Ver todas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
    </header>
  )
}
