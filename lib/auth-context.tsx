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
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 800))
    const found = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    )
    if (!found) throw new Error("E-mail ou senha inválidos")
    const { password: _, ...userData } = found
    setUser(userData)
    // Simulate user already has a company (for returning users)
    // New users won't have companies set
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setActiveCompanyState(null)
    setCompanies([])
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
  }, [])

  const completeOnboarding = useCallback((company: Company) => {
    setCompanies((prev) => [...prev, company])
    setActiveCompanyState(company)
  }, [])

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
