"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, Search } from "lucide-react"
import { useSortable, SortableTh, ColDef } from "@/components/admin/sortable-header"

interface AuditLog {
  id: string
  admin_name: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  toggle_user_active:    "Alterou status de usuário",
  toggle_company_active: "Alterou status de empresa",
  sync_suppliers:        "Sync fornecedores ObraPlay",
  sync_vitrine:          "Sync vitrine de insumos",
  toggle_item_active:    "Alterou item da vitrine",
  set_platform_admin:    "Alterou admin da plataforma",
}

function fmtDatetime(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PER = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/auditoria?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / PER)

  const COLS: ColDef[] = [
    { label: "Data",     key: "created_at" },
    { label: "Admin",    key: "admin_name" },
    { label: "Ação",     key: "action" },
    { label: "Entidade", key: "entity_type" },
  ]
  const { sorted, sortKey, sortDir, toggle } = useSortable(logs as unknown as Record<string, unknown>[])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#212121]">Auditoria</h1>
          <p className="text-sm text-[#757575] mt-0.5">Log de ações administrativas</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
        <input
          type="text"
          placeholder="Buscar por ação ou admin..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2 border border-[#EEEEEE] rounded-xl text-sm text-[#212121] placeholder-[#9E9E9E] focus:outline-none focus:border-[#1565C0] bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F5F5F5]">
              {COLS.map(col => <SortableTh key={col.label} col={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggle} />)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {[1,2,3,4].map(j => <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F5F5F5] rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <Shield size={32} className="text-[#BDBDBD] mx-auto mb-2" />
                  <p className="text-sm text-[#9E9E9E]">Nenhuma ação registrada ainda</p>
                </td>
              </tr>
            ) : (sorted as unknown as AuditLog[]).map(log => (
              <tr key={log.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] transition-colors">
                <td className="px-4 py-3 text-[#9E9E9E] text-xs whitespace-nowrap">{fmtDatetime(log.created_at)}</td>
                <td className="px-4 py-3 font-medium text-[#212121]">{log.admin_name}</td>
                <td className="px-4 py-3 text-[#424242]">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-4 py-3 text-[#9E9E9E] text-xs hidden md:table-cell">
                  {log.entity_type ? `${log.entity_type} #${log.entity_id?.slice(0, 8)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5F5F5]">
            <p className="text-xs text-[#9E9E9E]">{((page-1)*PER)+1}–{Math.min(page*PER,total)} de {total}</p>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="text-xs px-3 py-1.5 border border-[#EEEEEE] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F5]">Anterior</button>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="text-xs px-3 py-1.5 border border-[#EEEEEE] rounded-lg disabled:opacity-40 hover:bg-[#F5F5F5]">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
