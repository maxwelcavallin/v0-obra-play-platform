"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MoreVertical, UserPlus, CheckCircle, Copy, Check, Link2, Shield, ChevronRight, Plus, Loader2,
} from "lucide-react"
import { MOCK_PROFILES, type UserRole, type PermissionProfile } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface CompanyUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: "ativo" | "inativo"
  is_verified: boolean
  avatar?: string
}

const ROLE_COLORS: Record<UserRole, string> = {
  Admin:        "op-chip-primary",
  Comprador:    "op-chip-warning",
  Financeiro:   "op-chip-success",
  Visualizador: "op-chip-neutral",
  Personalizado:"op-chip-neutral",
}

function UserAvatar({ user }: { user: CompanyUser }) {
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#1565C0] flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-sm">{initials}</span>
    </div>
  )
}

// ─── Modal Convidar ───────────────────────────────────────────
const INVITE_ROLES: UserRole[] = ["Admin", "Comprador", "Financeiro", "Visualizador", "Personalizado"]

function InviteModal({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<UserRole>("Comprador")
  const [link, setLink] = useState("")
  const [copied, setCopied] = useState(false)

  function generateLink() {
    const token = Math.random().toString(36).substring(2, 10)
    setLink(`https://app.obraplay.com/convite/${token}`)
  }

  function copyLink() {
    try {
      // Fallback via textarea para ambientes sem permissao de Clipboard API
      const el = document.createElement("textarea")
      el.value = link
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.focus()
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    } catch {
      // silencia erros em ambientes restritos
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Link copiado!")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl shadow-2xl" style={{ maxWidth: 480, padding: "24px 20px 32px" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
        </div>
        <h2 className="font-semibold text-[#212121] mb-4" style={{ fontSize: "1rem" }}>Convidar usuário</h2>

        {/* Seleção de perfil */}
        <p className="text-[#9E9E9E] mb-2" style={{ fontSize: "0.75rem" }}>Perfil de acesso</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {INVITE_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`op-chip cursor-pointer border transition-colors ${
                role === r
                  ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]"
                  : "border-[#E0E0E0] bg-white text-[#424242]"
              }`}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: "0.8125rem" }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Gerar link */}
        <button
          type="button"
          onClick={generateLink}
          className="op-btn-secondary mb-4 flex items-center gap-2"
        >
          <Link2 size={15} />
          Gerar link de convite
        </button>

        {/* Campo do link */}
        {link && (
          <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-3 py-2.5 mb-4">
            <span className="flex-1 text-[#424242] truncate" style={{ fontSize: "0.8125rem" }}>{link}</span>
            <button
              type="button"
              onClick={copyLink}
              className="text-[#1565C0] flex-shrink-0"
              aria-label="Copiar link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} className="op-btn-primary">
          Fechar
        </button>
      </div>
    </div>
  )
}

// ─── Modal Permissões ─────────────────────────────────────────
function PermissionsModal({
  user,
  onClose,
  onCreateNew,
}: {
  user: CompanyUser
  onClose: () => void
  onCreateNew: () => void
}) {
  const [profiles] = useState<PermissionProfile[]>(MOCK_PROFILES)
  const [selected, setSelected] = useState<string>(
    profiles.find((p) => p.name === user.role)?.id ?? profiles[0]?.id ?? ""
  )

  function handleApply() {
    const profile = profiles.find((p) => p.id === selected)
    if (profile) toast.success(`Perfil "${profile.name}" aplicado a ${user.name}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxWidth: 480, maxHeight: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
        </div>

        <div className="px-5 pb-3 flex-shrink-0">
          <h2 className="font-semibold text-[#212121]" style={{ fontSize: "1rem" }}>
            Permissões de {user.name}
          </h2>
          <p className="text-[#9E9E9E] mt-0.5" style={{ fontSize: "0.75rem" }}>
            Selecione um perfil de acesso existente
          </p>
        </div>

        {/* Lista de perfis */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelected(profile.id)}
              className="w-full flex items-center gap-3 py-3 border-b border-[#F5F5F5] text-left"
            >
              {/* Radio visual */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  selected === profile.id ? "border-[#1565C0]" : "border-[#BDBDBD]"
                }`}
              >
                {selected === profile.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#212121]" style={{ fontSize: "0.875rem" }}>
                  {profile.name}
                </p>
                <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.7rem" }}>
                  {Object.entries(profile.permissions)
                    .filter(([, v]) => Object.values(v).some(Boolean))
                    .map(([k]) => k)
                    .slice(0, 3)
                    .join(", ")}
                  {Object.entries(profile.permissions).filter(([, v]) => Object.values(v).some(Boolean)).length > 3
                    ? "..." : ""}
                </p>
              </div>
            </button>
          ))}

          {/* Criar novo perfil */}
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full flex items-center gap-3 py-3 text-[#1565C0]"
          >
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#1565C0] flex items-center justify-center flex-shrink-0">
              <Plus size={11} className="text-[#1565C0]" />
            </div>
            <span className="font-medium" style={{ fontSize: "0.875rem" }}>Criar novo perfil</span>
            <ChevronRight size={14} className="ml-auto text-[#1565C0]" />
          </button>
        </div>

        {/* Botão aplicar */}
        <div className="flex-shrink-0 border-t border-[#EEEEEE]" style={{ padding: "12px 16px 28px" }}>
          <button type="button" onClick={handleApply} className="op-btn-primary">
            APLICAR PERFIL
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Menu 3 pontos ────────────────────────────────────────────
function UserMenu({ user, onClose, onManagePerms, onRemove }: {
  user: CompanyUser
  onClose: () => void
  onManagePerms: () => void
  onRemove: () => void
}) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-xl border border-[#EEEEEE] py-1 z-50"
        style={{ top: 64, right: 16, minWidth: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { onManagePerms(); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#424242] hover:bg-[#F5F5F5] transition-colors text-left"
          style={{ fontSize: "0.875rem" }}
        >
          <Shield size={16} className="text-[#757575]" />
          Editar permissões
        </button>
        <button
          onClick={() => { onRemove(); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#F44336] hover:bg-[#FFEBEE] transition-colors text-left"
          style={{ fontSize: "0.875rem" }}
        >
          <UserPlus size={16} className="rotate-180" />
          Remover usuário
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function UsuariosPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [menuUser, setMenuUser] = useState<CompanyUser | null>(null)
  const [permUser, setPermUser] = useState<CompanyUser | null>(null)

  useEffect(() => {
    if (!activeCompany?.id) return
    setLoadingUsers(true)
    authFetch(`/api/empresas/${activeCompany.id}/usuarios`)
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [activeCompany?.id])

  async function handleRemove(userId: string) {
    if (!activeCompany?.id) return
    await authFetch(`/api/empresas/${activeCompany.id}/usuarios/${userId}`, { method: "DELETE" })
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    toast.success("Usuário removido")
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Sub-header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center justify-between px-3 relative flex-shrink-0" style={{ height: 52 }}>
        <span className="font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Usuários da empresa</span>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 text-[#1565C0] font-medium"
          style={{ fontSize: "0.8125rem" }}
        >
          <UserPlus size={16} />
          Convidar
        </button>
      </div>

      <div className="px-3 py-3 flex flex-col gap-2">
        {loadingUsers && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loadingUsers && users.length === 0 && (
          <div className="text-center py-12 text-[#9E9E9E]" style={{ fontSize: "0.875rem" }}>
            Nenhum usuário cadastrado
          </div>
        )}
        {!loadingUsers && users.map((u) => (
          <div key={u.id} className="bg-white rounded-lg shadow-sm flex items-center gap-3 px-3 py-3">
            {/* Avatar + status dot */}
            <div className="relative flex-shrink-0">
              <UserAvatar user={u} />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  u.status === "ativo" ? "bg-[#4CAF50]" : "bg-[#9E9E9E]"
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-[#212121] truncate" style={{ fontSize: "0.875rem" }}>
                  {u.name}
                </span>
                {u.is_verified && (
                  <CheckCircle size={13} className="text-[#1565C0] flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`op-chip text-xs ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                <span className="text-[#9E9E9E]" style={{ fontSize: "0.7rem" }}>
                  {u.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-[#9E9E9E] truncate" style={{ fontSize: "0.7rem", marginTop: 1 }}>{u.email}</p>
            </div>

            {/* Menu 3 pontos */}
            <button
              onClick={() => setMenuUser(u)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors flex-shrink-0"
              aria-label="Opções"
            >
              <MoreVertical size={18} className="text-[#9E9E9E]" />
            </button>
          </div>
        ))}
      </div>

      {/* Link para perfis de permissão */}
      <div className="px-3 pb-6">
        <button
          onClick={() => router.push("/dashboard/usuarios/perfis")}
          className="w-full bg-white rounded-lg shadow-sm flex items-center gap-3 px-3 py-3 hover:bg-[#F9F9F9] transition-colors"
        >
          <div className="op-icon-circle-sm">
            <Shield size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-[#212121]" style={{ fontSize: "0.875rem" }}>Perfis de permissão</p>
            <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>Gerencie o que cada perfil pode fazer</p>
          </div>
          <Shield size={16} className="text-[#9E9E9E]" />
        </button>
      </div>

      {/* Modais */}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {menuUser && (
        <UserMenu
          user={menuUser}
          onClose={() => setMenuUser(null)}
          onManagePerms={() => { setPermUser(menuUser); setMenuUser(null) }}
          onRemove={() => handleRemove(menuUser.id)}
        />
      )}
      {permUser && (
        <PermissionsModal
          user={permUser}
          onClose={() => setPermUser(null)}
          onCreateNew={() => { setPermUser(null); router.push("/dashboard/usuarios/perfis") }}
        />
      )}
    </div>
  )
}
