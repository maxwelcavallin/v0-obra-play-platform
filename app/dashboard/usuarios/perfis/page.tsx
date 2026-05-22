"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { MOCK_PROFILES, PERM_MODULES, type PermissionProfile, type PermAction, type PermModule } from "@/lib/mock-data"
import { toast } from "sonner"

const ACTIONS: PermAction[] = ["Visualizar", "Criar", "Editar", "Excluir"]

function ProfileEditor({
  profile,
  onSave,
}: {
  profile: PermissionProfile
  onSave: (p: PermissionProfile) => void
}) {
  const [name, setName] = useState(profile.name)
  const [perms, setPerms] = useState(profile.permissions)

  function toggle(mod: PermModule, action: PermAction) {
    setPerms((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] },
    }))
  }

  function handleSave() {
    onSave({ ...profile, name, permissions: perms })
    toast.success("Perfil salvo!")
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Nome do perfil */}
      <div className="bg-white px-4 py-3 border-b border-[#EEEEEE]">
        <label className="text-[#9E9E9E] block" style={{ fontSize: "0.75rem" }}>Nome do perfil</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="op-input-underline"
          placeholder="Ex: Gerente de compras"
        />
      </div>

      {/* Grid de permissões */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Cabeçalho */}
        <div className="flex items-center gap-1 mb-2 px-2">
          <div className="flex-1" />
          {ACTIONS.map((a) => (
            <div key={a} className="w-16 text-center text-[#9E9E9E]" style={{ fontSize: "0.65rem" }}>{a}</div>
          ))}
        </div>

        {PERM_MODULES.map((mod) => (
          <div key={mod} className="bg-white rounded-lg mb-2 overflow-hidden shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5">
              <div className="flex-1">
                <span className="font-medium text-[#424242]" style={{ fontSize: "0.875rem" }}>{mod}</span>
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
      </div>

      {/* Salvar */}
      <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE]" style={{ padding: "12px 16px 20px" }}>
        <button type="button" onClick={handleSave} className="op-btn-primary">
          <Save size={15} />
          SALVAR PERFIL
        </button>
      </div>
    </div>
  )
}

export default function PerfisPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<PermissionProfile[]>(MOCK_PROFILES)
  const [selected, setSelected] = useState<PermissionProfile>(profiles[0])

  function handleSave(updated: PermissionProfile) {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelected(updated)
  }

  function createNew() {
    const newProfile: PermissionProfile = {
      id: `prof-${Date.now()}`,
      name: "Novo perfil",
      companyId: "cmp-001",
      permissions: Object.fromEntries(
        PERM_MODULES.map((m) => [m, { Visualizar: false, Criar: false, Editar: false, Excluir: false }])
      ) as PermissionProfile["permissions"],
    }
    setProfiles((prev) => [...prev, newProfile])
    setSelected(newProfile)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-2 relative flex-shrink-0" style={{ height: 52 }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-medium text-[#212121]" style={{ fontSize: "1rem" }}>
          Perfis de permissão
        </span>
        <button
          onClick={createNew}
          className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
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
              selected.id === p.id ? "text-[#1565C0]" : "text-[#757575]"
            }`}
          >
            {p.name}
            {selected.id === p.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1565C0] rounded-t" />
            )}
          </button>
        ))}
      </div>

      <ProfileEditor key={selected.id} profile={selected} onSave={handleSave} />
    </div>
  )
}
