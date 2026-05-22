"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { authFetch } from "./auth-fetch"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
}

export interface Company {
  id: string
  fantasyName: string
  companyName: string
  cnpj: string
  city: string
  state: string
  logoUrl?: string
}

interface AuthContextType {
  user: User | null
  activeCompany: Company | null
  companies: Company[]
  isAuthenticated: boolean
  hasCompany: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: RegisterData) => Promise<void>
  setActiveCompany: (company: Company) => void
  completeOnboarding: (company: Company) => void
  updateUser: (u: Partial<User>) => void
}

interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
}

const AuthContext = createContext<AuthContextType | null>(null)

// Mapeia row do banco (snake_case) para interface Company (camelCase)
function mapCompany(row: any): Company {
  return {
    id: row.id,
    fantasyName: row.fantasy_name,
    companyName: row.company_name ?? "",
    cnpj: row.cnpj ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    logoUrl: row.logo_url ?? undefined,
  }
}

function loadSession(): { user: User | null; companies: Company[]; activeCompany: Company | null } {
  if (typeof window === "undefined") return { user: null, companies: [], activeCompany: null }
  try {
    const raw = localStorage.getItem("op_session")
    if (!raw) return { user: null, companies: [], activeCompany: null }
    return JSON.parse(raw)
  } catch {
    return { user: null, companies: [], activeCompany: null }
  }
}

function saveSession(user: User | null, companies: Company[], activeCompany: Company | null) {
  if (typeof window === "undefined") return
  if (!user) { localStorage.removeItem("op_session"); return }
  localStorage.setItem("op_session", JSON.stringify({ user, companies, activeCompany }))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = loadSession()
  const [user, setUser] = useState<User | null>(session.user)
  const [companies, setCompanies] = useState<Company[]>(session.companies)
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(session.activeCompany)

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erro ao entrar")

    const userData: User = data.user
    const mappedCompanies: Company[] = (data.companies ?? []).map(mapCompany)
    const active = mappedCompanies[0] ?? null

    // Persiste token para envio via header (fallback ao cookie em iframes)
    if (data.token) localStorage.setItem("op_token", data.token)

    setUser(userData)
    setCompanies(mappedCompanies)
    setActiveCompanyState(active)
    saveSession(userData, mappedCompanies, active)
  }, [])

  const logout = useCallback(async () => {
    await authFetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    localStorage.removeItem("op_token")
    setUser(null)
    setActiveCompanyState(null)
    setCompanies([])
    saveSession(null, [], null)
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "Erro ao cadastrar")

    const userData: User = json.user
    if (json.token) localStorage.setItem("op_token", json.token)
    setUser(userData)
    setCompanies([])
    setActiveCompanyState(null)
    saveSession(userData, [], null)
  }, [])

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...partial }
      setCompanies((comps) => {
        saveSession(updated, comps, activeCompany)
        return comps
      })
      return updated
    })
  }, [activeCompany])

  const setActiveCompany = useCallback((company: Company) => {
    setActiveCompanyState(company)
    setCompanies((prev) => {
      saveSession(user, prev, company)
      return prev
    })
  }, [user])

  const completeOnboarding = useCallback(async (company: Company) => {
    // Persiste no banco
    const res = await authFetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fantasy_name: company.fantasyName,
        company_name: company.companyName,
        cnpj: company.cnpj,
        logo_url: company.logoUrl,
        city: company.city,
        state: company.state,
      }),
    })

    let saved = company
    if (res.ok) {
      const row = await res.json()
      saved = mapCompany(row)
    }

    setCompanies((prev) => {
      const updated = [...prev, saved]
      saveSession(user, updated, saved)
      return updated
    })
    setActiveCompanyState(saved)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCompany,
        companies,
        isAuthenticated: !!user,
        hasCompany: companies.length > 0,
        login,
        logout,
        register,
        setActiveCompany,
        completeOnboarding,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
