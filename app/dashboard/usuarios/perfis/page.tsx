'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

const PERM_MODULES = ["Cotações", "Ordens de Compra", "Financeiro", "Relatórios", "Usuários"] as const
type PermModule = typeof PERM_MODULES[number]
type PermAction = "Visualizar" | "Criar" | "Editar" | "Excluir"
const ACTIONS: PermAction[] = ["Visualizar", "Criar", "Editar", "Excluir"]

type PermissionProfile = {
  id: string
  company_id: string
  name: string
  is_admin: boolean
  permissions: Record<PermModule, Record<PermAction, boolean>>
}

function ProfileEditor({
  profile,
  onSave,
  onDelete,
  saving,
}: {
  profile: PermissionProfile
  onSave: (p: PermissionProfile) => void
  onDelete: (id: string) => void
  saving: boolean
}) {
  const [name, setName] = useState(profile.name)
  const [isAdmin, setIsAdmin] = useState(profile.is_admin)
  const [perms, setPerms] = useState(profile.permissions)

  function toggle(mod: PermModule, action: PermAction) {
    if (isAdmin) return
    setPerms((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] },
    }))
  }

  function handleSave() {
    onSave({ ...profile, name, is_admin: isAdmin, permissions: perms })
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Nome e tipo */}
      <div className="bg-white px-4 py-3 border-b border-[#EEEEEE] space-y-3">
        <div>
          <label className="text-[#9E9E9E] block text-xs mb-1">Nome do perfil</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1.5 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#1565C0]"
            placeholder="Ex: Gerente de compras"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-[#212121]">Admin (acesso total a tudo)</span>
        </label>
      </div>

      {/* Grid de permissões */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {!isAdmin && (
          <>
            {/* Cabeçalho */}
            <div className="flex items-center gap-1 mb-2 px-2">
              <div className="flex-1" />
              {ACTIONS.map((a) => (
                <div key={a} className="w-16 text-center text-[#9E9E9E] text-[0.65rem]">{a}</div>
              ))}
            </div>

            {PERM_MODULES.map((mod) => (
              <div key={mod} className="bg-white rounded-lg mb-2 overflow-hidden shadow-sm">
                <div className="flex items-center gap-1 px-3 py-2.5">
                  <div className="flex-1">
                    <span className="font-medium text-[#424242] text-sm">{mod}</span>
                  </div>
                  {ACTIONS.map((action) => (
                    <div key={action} className="w-16 flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggle(mod, action)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          perms[mod]?.[action]
                            ? "bg-[#1565C0] border-[#1565C0]"
                            : "border-[#BDBDBD] bg-white"
                        }`}
                        aria-label={`${action} ${mod}`}
                      >
                        {perms[mod]?.[action] && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {isAdmin && (
          <div className="px-4 py-6 text-center text-[#9E9E9E] text-sm">
            Admin tem acesso total. Nenhuma permissão específica necessária.
          </div>
        )}
      </div>

      {/* Salvar / Excluir */}
      <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE] p-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDelete(profile.id)}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-[#FFEBEE] text-[#D32F2F] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FFCDD2] transition-colors disabled:opacity-60"
        >
          <Trash2 size={14} />
          Excluir
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-[#1565C0] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0D47A1] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  )
}

export default function PerfisPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  const [selected, setSelected] = useState<PermissionProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeCompany?.id) return
    loadPerfis()
  }, [activeCompany?.id])

  async function loadPerfis() {
    try {
      setLoading(true)
      const res = await fetch(`/api/permission-profiles?company_id=${activeCompany?.id}`)
      if (!res.ok) throw new Error("Erro ao carregar perfis")
      const data = await res.json()
      setProfiles(data)
      if (data.length > 0) setSelected(data[0])
    } catch (e) {
      console.error("[perfis loadPerfis] erro:", e)
      toast.error("Erro ao carregar perfis")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(updated: PermissionProfile) {
    try {
      setSaving(true)
      const method = profiles.some(p => p.id === updated.id) ? "PUT" : "POST"
      const url = method === "PUT" ? `/api/permission-profiles/${updated.id}` : "/api/permission-profiles"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error("Erro ao salvar perfil")
      const saved = await res.json()
      setProfiles((prev) =>
        prev.some(p => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved]
      )
      setSelected(saved)
      toast.success("Perfil salvo!")
    } catch (e) {
      console.error("[perfis handleSave] erro:", e)
      toast.error("Erro ao salvar perfil")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este perfil?")) return
    try {
      setSaving(true)
      const res = await fetch(`/api/permission-profiles/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir perfil")
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      if (selected?.id === id) setSelected(profiles.find(p => p.id !== id) || null)
      toast.success("Perfil excluído!")
    } catch (e) {
      console.error("[perfis handleDelete] erro:", e)
      toast.error("Erro ao excluir perfil")
    } finally {
      setSaving(false)
    }
  }

  async function createNew() {
    const newProfile: PermissionProfile = {
      id: "", // será gerado no servidor
      company_id: activeCompany?.id || "",
      name: "Novo perfil",
      is_admin: false,
      permissions: Object.fromEntries(
        PERM_MODULES.map((m) => [m, { Visualizar: false, Criar: false, Editar: false, Excluir: false }])
      ) as PermissionProfile["permissions"],
    }
    try {
      setSaving(true)
      const res = await fetch("/api/permission-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProfile),
      })
      if (!res.ok) throw new Error("Erro ao criar perfil")
      const created = await res.json()
      setProfiles((prev) => [...prev, created])
      setSelected(created)
      toast.success("Perfil criado!")
    } catch (e) {
      console.error("[perfis createNew] erro:", e)
      toast.error("Erro ao criar perfil")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1565C0]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0 h-13">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121] text-base">
          Perfis de permissão
        </span>
        <button
          onClick={createNew}
          disabled={saving}
          className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors disabled:opacity-60"
          aria-label="Novo perfil"
        >
          <Plus size={20} className="text-[#1565C0]" />
        </button>
      </div>

      {/* Tabs de perfil */}
      <div className="bg-white border-b border-[#EEEEEE] flex overflow-x-auto flex-shrink-0">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
              selected?.id === p.id ? "text-[#1565C0]" : "text-[#757575]"
            }`}
          >
            {p.name}
            {selected?.id === p.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1565C0] rounded-t" />
            )}
          </button>
        ))}
      </div>

      {selected && (
        <ProfileEditor
          key={selected.id}
          profile={selected}
          onSave={handleSave}
          onDelete={handleDelete}
          saving={saving}
        />
      )}
    </div>
  )
}
