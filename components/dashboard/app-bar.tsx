"use client"

import { useState } from "react"
import { Bell, ChevronDown, LogOut, Settings, User, HardHat, Check, Plus } from "lucide-react"
import { useAuth, type Company } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export function AppBar() {
  const { user, activeCompany, companies, setActiveCompany, logout } = useAuth()
  const router = useRouter()
  const [companyOpen, setCompanyOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  function handleLogout() {
    logout()
    router.push("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0D1B3E] flex items-center px-4 gap-3 shadow-lg md:pl-[272px]">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <HardHat className="w-5 h-5 text-white" />
        <span className="text-white font-bold text-base">OBRA PLAY</span>
      </div>

      {/* Company selector */}
      <div className="relative ml-auto md:ml-0">
        <button
          onClick={() => { setCompanyOpen((v) => !v); setUserOpen(false); setNotifOpen(false) }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors max-w-[200px]"
          aria-label="Selecionar empresa"
        >
          <div className="w-6 h-6 rounded bg-[#1565C0] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {activeCompany?.fantasyName?.[0] ?? "E"}
            </span>
          </div>
          <span className="text-white text-sm font-medium truncate">
            {activeCompany?.fantasyName ?? "Selecionar empresa"}
          </span>
          <ChevronDown size={14} className="text-white/60 flex-shrink-0" />
        </button>

        {companyOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl py-1 border border-[#E0E0E0] z-50">
            {companies.map((c: Company) => (
              <button
                key={c.id}
                onClick={() => { setActiveCompany(c); setCompanyOpen(false) }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F4F6F8] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded bg-[#1565C0] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{c.fantasyName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1A1A2E] text-sm font-medium truncate">{c.fantasyName}</p>
                  <p className="text-[#607D8B] text-xs truncate">{c.city} · {c.state}</p>
                </div>
                {activeCompany?.id === c.id && (
                  <Check size={16} className="text-[#1565C0] flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-[#E0E0E0] mt-1 pt-1">
              <button
                onClick={() => { setCompanyOpen(false); router.push("/onboarding") }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F4F6F8] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded border-2 border-dashed border-[#E0E0E0] flex items-center justify-center">
                  <Plus size={14} className="text-[#607D8B]" />
                </div>
                <span className="text-[#607D8B] text-sm">Nova empresa</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setCompanyOpen(false); setUserOpen(false) }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Notificações"
          >
            <Bell size={20} className="text-white" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF9800]" />
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

        {/* User avatar */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen((v) => !v); setCompanyOpen(false); setNotifOpen(false) }}
            className="w-9 h-9 rounded-lg bg-[#1565C0] flex items-center justify-center hover:bg-[#1976D2] transition-colors"
            aria-label="Menu do usuário"
          >
            <span className="text-white text-sm font-bold">{initials}</span>
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-[#E0E0E0] py-1 z-50">
              <div className="px-4 py-3 border-b border-[#E0E0E0]">
                <p className="text-[#1A1A2E] font-semibold text-sm">{user?.name}</p>
                <p className="text-[#607D8B] text-xs">{user?.email}</p>
              </div>
              <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F4F6F8] transition-colors text-sm text-[#1A1A2E]">
                <User size={16} className="text-[#607D8B]" /> Meu perfil
              </button>
              <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F4F6F8] transition-colors text-sm text-[#1A1A2E]">
                <Settings size={16} className="text-[#607D8B]" /> Configurações
              </button>
              <div className="border-t border-[#E0E0E0] mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#FFF5F5] transition-colors text-sm text-[#F44336]"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close dropdowns */}
      {(companyOpen || userOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setCompanyOpen(false); setUserOpen(false); setNotifOpen(false) }}
        />
      )}
    </header>
  )
}
