"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock, User, ChevronRight, LogOut, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { OpInput } from "@/components/ui/op-input"
import { OpAvatarUpload } from "@/components/ui/op-avatar-upload"

type Section = "main" | "dados" | "senha"

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function PerfilPage() {
  const router = useRouter()
  const { user, logout, updateUser } = useAuth()

  const [section, setSection] = useState<Section>("main")
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar)
  const [avatarChanged, setAvatarChanged] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)

  // Dados pessoais
  const [name, setName] = useState(user?.name ?? "")
  const [email] = useState(user?.email ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [dadosErrors, setDadosErrors] = useState<Record<string, string>>({})
  const [dadosSaving, setDadosSaving] = useState(false)
  const [dadosSaved, setDadosSaved] = useState(false)

  // Senha
  const [currentPass, setCurrentPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [passErrors, setPassErrors] = useState<Record<string, string>>({})
  const [passSaving, setPassSaving] = useState(false)

  // Carrega dados atuais da API ao abrir e sincroniza avatar no contexto global
  useEffect(() => {
    authFetch("/api/auth/perfil")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name)
        if (data.phone) setPhone(data.phone)
        if (data.photo_url) {
          setAvatar(data.photo_url)
          updateUser({ avatar: data.photo_url })
        }
      })
      .catch(() => {})
  }, [])

  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("")
    : "U"

  async function saveAvatar() {
    setAvatarSaving(true)
    try {
      const res = await authFetch("/api/auth/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null, photo_url: avatar ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar foto")
      updateUser({ avatar: data.photo_url ?? undefined })
      setAvatarChanged(false)
      toast.success("Foto de perfil atualizada!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAvatarSaving(false)
    }
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  async function saveDados() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Nome obrigatório"
    if (Object.keys(errs).length) { setDadosErrors(errs); return }

    setDadosSaving(true)
    try {
      const res = await authFetch("/api/auth/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone || null, photo_url: avatar ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      updateUser({ name: data.name, phone: data.phone, avatar: data.photo_url ?? undefined })
      setDadosSaved(true)
      toast.success("Dados atualizados com sucesso")
      setTimeout(() => { setDadosSaved(false); setSection("main") }, 1200)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDadosSaving(false)
    }
  }

  async function saveSenha() {
    const errs: Record<string, string> = {}
    if (!currentPass) errs.current = "Informe a senha atual"
    if (newPass.length < 8) errs.new = "Mínimo de 8 caracteres"
    if (newPass !== confirmPass) errs.confirm = "Senhas não coincidem"
    if (Object.keys(errs).length) { setPassErrors(errs); return }

    setPassSaving(true)
    try {
      const res = await authFetch("/api/auth/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          photo_url: avatar ?? null,
          current_password: currentPass,
          new_password: newPass,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao alterar senha")
      setCurrentPass(""); setNewPass(""); setConfirmPass("")
      toast.success("Senha atualizada com sucesso")
      setSection("main")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPassSaving(false)
    }
  }

  /* ─── Main ─── */
  if (section === "main") return (
    <div className="min-h-dvh bg-[#F5F5F5] flex flex-col">

      {/* Sub-header */}
      <header className="op-subheader border-b border-[#EEEEEE] bg-white">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors" aria-label="Voltar">
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="op-subheader-title">Meu perfil</span>
      </header>

      {/* Avatar + nome */}
      <div className="bg-white border-b border-[#EEEEEE] flex flex-col items-center py-6 gap-2">
        <OpAvatarUpload
          src={avatar}
          initials={initials}
          size={80}
          onChange={(v) => { setAvatar(v); setAvatarChanged(true) }}
          label="Alterar foto"
        />
        <p className="font-semibold text-[#212121]" style={{ fontSize: "1rem" }}>
          {user?.name ?? "Usuário"}
        </p>
        <p className="text-[#9E9E9E]" style={{ fontSize: "0.875rem" }}>
          {user?.email}
        </p>

        {/* Botão salvar foto — aparece apenas quando a foto é alterada */}
        {avatarChanged && (
          <button
            type="button"
            onClick={saveAvatar}
            disabled={avatarSaving}
            className="mt-1 flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1565C0] text-white text-sm font-semibold shadow hover:bg-[#1255A8] transition-colors disabled:opacity-70"
          >
            {avatarSaving
              ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
              : <><Check size={14} /> Salvar foto</>}
          </button>
        )}
      </div>

      {/* Menu items */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-2">

        {/* Dados pessoais */}
        <button
          onClick={() => setSection("dados")}
          className="bg-white rounded-lg w-full flex items-center gap-3 px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#F9F9F9] transition-colors text-left"
        >
          <div className="op-icon-circle-sm flex-shrink-0">
            <User size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1565C0] font-medium" style={{ fontSize: "0.9375rem" }}>
              Dados pessoais
            </p>
            <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>
              Nome, e-mail e telefone
            </p>
          </div>
          <ChevronRight size={16} className="text-[#BDBDBD]" />
        </button>

        {/* Alterar senha */}
        <button
          onClick={() => setSection("senha")}
          className="bg-white rounded-lg w-full flex items-center gap-3 px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#F9F9F9] transition-colors text-left"
        >
          <div className="op-icon-circle-sm flex-shrink-0">
            <Lock size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1565C0] font-medium" style={{ fontSize: "0.9375rem" }}>
              Alterar senha
            </p>
            <p className="text-[#9E9E9E]" style={{ fontSize: "0.75rem" }}>
              Altere sua senha de acesso
            </p>
          </div>
          <ChevronRight size={16} className="text-[#BDBDBD]" />
        </button>

        {/* Sair */}
        <button
          onClick={handleLogout}
          className="bg-white rounded-lg w-full flex items-center gap-3 px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#FFF5F5] transition-colors text-left mt-2"
        >
          <div className="w-10 h-10 rounded-full bg-[#FFEBEE] flex items-center justify-center flex-shrink-0">
            <LogOut size={18} className="text-[#F44336]" />
          </div>
          <p className="text-[#F44336] font-medium" style={{ fontSize: "0.9375rem" }}>
            Sair da conta
          </p>
        </button>
      </div>
    </div>
  )

  /* ─── Dados pessoais ─── */
  if (section === "dados") return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="op-subheader border-b border-[#EEEEEE]">
        <button onClick={() => setSection("main")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors" aria-label="Voltar">
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="op-subheader-title">Dados pessoais</span>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 96px" }}>
        <div className="flex flex-col items-center mb-6">
          <OpAvatarUpload src={avatar} initials={initials} size={72} onChange={setAvatar} label="Alterar foto" />
        </div>

        <form id="dados-form" noValidate onSubmit={(e) => { e.preventDefault(); saveDados() }}
          className="flex flex-col gap-1">
          <OpInput label="Nome completo*" value={name} onChange={(e) => { setName(e.target.value); setDadosErrors((p) => ({ ...p, name: "" })) }} placeholder="Seu nome completo" error={dadosErrors.name} />
          <OpInput label="E-mail*" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setDadosErrors((p) => ({ ...p, email: "" })) }} placeholder="seu@email.com" error={dadosErrors.email} />
          <OpInput label="Telefone*" type="tel" value={phone} onChange={(e) => { setPhone(formatPhone(e.target.value)); setDadosErrors((p) => ({ ...p, phone: "" })) }} placeholder="(00) 00000-0000" error={dadosErrors.phone} />
        </form>
      </div>

      <div className="flex-shrink-0 border-t border-[#EEEEEE] bg-white" style={{ padding: "16px 16px 20px" }}>
        <button form="dados-form" type="submit" className="op-btn-primary" disabled={dadosSaving}>
          {dadosSaving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
            : dadosSaved ? <><Check size={15} /> Salvo!</>
            : "SALVAR ALTERAÇÕES"}
        </button>
      </div>
    </div>
  )

  /* ─── Alterar senha ─── */
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="op-subheader border-b border-[#EEEEEE]">
        <button onClick={() => setSection("main")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors" aria-label="Voltar">
          <ArrowLeft size={20} className="text-[#212121]" />
        </button>
        <span className="op-subheader-title">Alterar senha</span>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 24px 96px" }}>
        <div className="op-info-box mb-6">
          <Lock size={15} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
          <span>Utilize letras maiusculas, minusculas, numeros, simbolos e no minimo 8 caracteres.</span>
        </div>

        <form id="senha-form" noValidate onSubmit={(e) => { e.preventDefault(); saveSenha() }}
          className="flex flex-col gap-1">
          <OpInput label="Senha atual*" type="password" value={currentPass} onChange={(e) => { setCurrentPass(e.target.value); setPassErrors((p) => ({ ...p, current: "" })) }} placeholder="Sua senha atual" error={passErrors.current} />
          <OpInput label="Nova senha*" type="password" value={newPass} onChange={(e) => { setNewPass(e.target.value); setPassErrors((p) => ({ ...p, new: "" })) }} placeholder="Mínimo 8 caracteres" error={passErrors.new} />
          <OpInput label="Confirmar nova senha*" type="password" value={confirmPass} onChange={(e) => { setConfirmPass(e.target.value); setPassErrors((p) => ({ ...p, confirm: "" })) }} placeholder="Repita a nova senha" error={passErrors.confirm} />
        </form>
      </div>

      <div className="flex-shrink-0 border-t border-[#EEEEEE] bg-white" style={{ padding: "16px 16px 20px" }}>
        <button form="senha-form" type="submit" className="op-btn-primary" disabled={passSaving}>
          {passSaving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : "ALTERAR SENHA"}
        </button>
      </div>
    </div>
  )
}
