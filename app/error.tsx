"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[v0] Erro global capturado:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6">
        <Image src="/logo.svg" alt="Obra Play" width={140} height={24} className="mx-auto opacity-80" />
      </div>

      <div className="w-20 h-20 rounded-full bg-[#FFF3E0] flex items-center justify-center mb-5 mx-auto">
        <AlertTriangle size={36} className="text-[#E65100]" />
      </div>

      <h1 className="text-xl font-bold text-[#212121] mb-2">Algo deu errado</h1>
      <p className="text-sm text-[#9E9E9E] max-w-[280px] leading-relaxed mb-8">
        Ocorreu um erro inesperado. Tente novamente ou volte para o início.
      </p>

      {error.digest && (
        <p className="text-[10px] text-[#BDBDBD] font-mono mb-4">ID: {error.digest}</p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1565C0] text-white text-sm font-semibold shadow hover:bg-[#1255A8] transition-colors"
        >
          <RefreshCw size={15} /> Tentar novamente
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#E0E0E0] bg-white text-sm font-medium text-[#424242] hover:bg-[#F9F9F9] transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
