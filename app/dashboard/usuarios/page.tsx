"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  MoreVertical, UserPlus, CheckCircle, Copy, Check, Link2, Shield,
} from "lucide-react"
import { MOCK_COMPANY_USERS, type CompanyUser, type UserRole } from "@/lib/mock-data"
import { toast } from "sonner"

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
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Link copiado!")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full bg-white rounded-t-2xl shadow-2xl" style={{ maxWidth: 480, padding: "24px 20px 32px" }}>
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
  const [users, setUsers] = useState<CompanyUser[]>(MOCK_COMPANY_USERS)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [menuUser, setMenuUser] = useState<CompanyUser | null>(null)

  function handleRemove(userId: string) {
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
        {users.map((u) => (
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
                {u.isVerified && (
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
          onManagePerms={() => router.push("/dashboard/usuarios/perfis")}
          onRemove={() => handleRemove(menuUser.id)}
        />
      )}
    </div>
  )
}
