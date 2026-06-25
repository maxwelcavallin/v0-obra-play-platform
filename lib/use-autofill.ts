"use client"

import { useState, useCallback } from "react"
import { maskCEP, maskCNPJ, rawDigits } from "./masks"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CepData {
  zipcode: string
  street: string
  neighbourhood: string
  city: string
  state: string
}

export interface CnpjData {
  company_name: string
  fantasy_name: string
  cnpj: string
  phone?: string
  email?: string
  zipcode?: string
  street?: string
  number?: string
  complement?: string
  neighbourhood?: string
  city?: string
  state?: string
}

// ─── useCEP ──────────────────────────────────────────────────────────────────

export function useCEP(onFill: (data: CepData) => void) {
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(
    async (value: string) => {
      const digits = rawDigits(value)
      if (digits.length !== 8) return
      setLoading(true)
      try {
        const res = await window.fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (data.erro) return
        onFill({
          zipcode: maskCEP(digits),
          street: data.logradouro ?? "",
          neighbourhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        })
      } catch { /* silencioso */ } finally {
        setLoading(false)
      }
    },
    [onFill],
  )

  return { fetchCEP: fetch, loadingCEP: loading }
}

// ─── useCNPJ ─────────────────────────────────────────────────────────────────

export function useCNPJ(onFill: (data: CnpjData) => void) {
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(
    async (value: string) => {
      const digits = rawDigits(value)
      if (digits.length !== 14) return
      setLoading(true)
      try {
        // API pública Brasil API (sem CORS em produção)
        const res = await window.fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
        if (!res.ok) return
        const data = await res.json()
        onFill({
          company_name: data.razao_social ?? "",
          fantasy_name: data.nome_fantasia ?? "",
          cnpj: maskCNPJ(digits),
          phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : undefined,
          email: data.email ?? undefined,
          zipcode: data.cep ? maskCEP(data.cep.replace(/\D/g, "")) : undefined,
          street: data.logradouro ?? undefined,
          number: data.numero ?? undefined,
          complement: data.complemento ?? undefined,
          neighbourhood: data.bairro ?? undefined,
          city: data.municipio ?? undefined,
          state: data.uf ?? undefined,
        })
      } catch { /* silencioso */ } finally {
        setLoading(false)
      }
    },
    [onFill],
  )

  return { fetchCNPJ: fetch, loadingCNPJ: loading }
}
