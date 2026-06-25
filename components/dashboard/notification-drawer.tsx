"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X, Check, CheckCheck, Trash2, ShoppingCart, FileText, AlertCircle, Info, TrendingDown, Package } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth-context"

interface Notification {
  id: string
  type: string
  title: string
  description?: string
  entity_type?: string
  entity_id?: string
  read_at: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "agora"
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string }> = {
    cotacao:     { icon: <FileText size={14} className="text-white" />,       bg: "bg-[#1565C0]" },
    ordem:       { icon: <ShoppingCart size={14} className="text-white" />,   bg: "bg-[#1565C0]" },
    vencimento:  { icon: <TrendingDown size={14} className="text-white" />,   bg: "bg-[#D32F2F]" },
    alerta:      { icon: <AlertCircle size={14} className="text-white" />,    bg: "bg-[#FF9800]" },
    insumo:      { icon: <Package size={14} className="text-white" />,        bg: "bg-[#4CAF50]" },
    info:        { icon: <Info size={14} className="text-white" />,            bg: "bg-[#757575]" },
  }
  const cfg = map[type] ?? map.info
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
      {cfg.icon}
    </div>
  )
}

export function NotificationBell({ companyId }: { companyId?: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const unread = items.filter(n => !n.read_at).length

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/notifications?company_id=${companyId}`)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  // Polling leve a cada 60s
  useEffect(() => {
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    await authFetch(`/api/notifications/${id}`, { method: "PATCH" })
  }

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    await authFetch(`/api/notifications/all`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    })
  }

  async function clearAll() {
    setItems([])
    await authFetch(`/api/notifications/all?company_id=${companyId}`, { method: "DELETE" })
  }

  return (
    <>
      {/* Sino */}
      <button
        onClick={() => { setOpen(true); load() }}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={22} className="text-white" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-[#FF3D00] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer lateral direito */}
      <div className={`fixed top-0 right-0 h-full w-[340px] max-w-[95vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#EEEEEE] bg-[#1565C0]">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-white" />
            <span className="font-bold text-white text-base">Notificações</span>
            {unread > 0 && (
              <span className="bg-[#FF3D00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Ações */}
        {items.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#EEEEEE] bg-[#F9F9F9]">
            <button
              onClick={markAllRead}
              disabled={unread === 0}
              className="flex items-center gap-1 text-xs text-[#1565C0] font-medium disabled:text-[#BDBDBD] hover:underline"
            >
              <CheckCheck size={13} /> Marcar todas como lidas
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-[#D32F2F] font-medium hover:underline"
            >
              <Trash2 size={13} /> Limpar
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="flex flex-col gap-3 p-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#EEEEEE] flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 bg-[#EEEEEE] rounded w-3/4" />
                    <div className="h-2.5 bg-[#EEEEEE] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <Bell size={28} className="text-[#BDBDBD]" />
              </div>
              <p className="font-semibold text-[#424242]">Tudo em dia!</p>
              <p className="text-sm text-[#9E9E9E]">Nenhuma notificação por enquanto.</p>
            </div>
          )}

          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-[#EEEEEE] text-left transition-colors ${n.read_at ? "bg-white" : "bg-[#EEF4FF]"} hover:bg-[#F5F9FF]`}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.read_at ? "text-[#424242] font-normal" : "text-[#212121] font-semibold"}`}>
                  {n.title}
                </p>
                {n.description && (
                  <p className="text-xs text-[#757575] mt-0.5 line-clamp-2">{n.description}</p>
                )}
                <p className="text-[10px] text-[#9E9E9E] mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <span className="w-2 h-2 rounded-full bg-[#1565C0] flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
