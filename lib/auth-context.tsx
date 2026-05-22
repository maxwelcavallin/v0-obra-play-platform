"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

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
}

interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
}

const AuthContext = createContext<AuthContextType | null>(null)

// Mock users for demo
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "usr-001",
    name: "Carlos Mendes",
    email: "carlos@construtora.com",
    phone: "(41) 99999-0000",
    password: "senha123",
  },
]

const MOCK_COMPANIES: Company[] = [
  {
    id: "cmp-001",
    fantasyName: "Construtora Mendes",
    companyName: "Construtora Mendes Ltda",
    cnpj: "12.345.678/0001-90",
    city: "Curitiba",
    state: "PR",
  },
  {
    id: "cmp-002",
    fantasyName: "Reforma Fácil",
    companyName: "Reforma Fácil Serviços Ltda",
    cnpj: "98.765.432/0001-10",
    city: "São Paulo",
    state: "SP",
  },
]

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
    await new Promise((r) => setTimeout(r, 800))
    const found = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    )
    if (!found) throw new Error("E-mail ou senha inválidos")
    const { password: _, ...userData } = found
    setUser(userData)
    setCompanies(MOCK_COMPANIES)
    setActiveCompanyState(MOCK_COMPANIES[0])
    saveSession(userData, MOCK_COMPANIES, MOCK_COMPANIES[0])
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setActiveCompanyState(null)
    setCompanies([])
    saveSession(null, [], null)
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    await new Promise((r) => setTimeout(r, 800))
    if (MOCK_USERS.find((u) => u.email === data.email)) {
      throw new Error("E-mail já cadastrado")
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
    }
    MOCK_USERS.push({ ...newUser, password: data.password })
    setUser(newUser)
  }, [])

  const setActiveCompany = useCallback((company: Company) => {
    setActiveCompanyState(company)
    setCompanies((prev) => {
      saveSession(user, prev, company)
      return prev
    })
  }, [user])

  const completeOnboarding = useCallback((company: Company) => {
    setCompanies((prev) => {
      const updated = [...prev, company]
      saveSession(user, updated, company)
      return updated
    })
    setActiveCompanyState(company)
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
