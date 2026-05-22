"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3 } from "lucide-react"

export default function HistoricoPrecosPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
      <div className="bg-[#1565C0] px-4 pt-4 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1">Histórico de Preços</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E3F2FD] flex items-center justify-center">
          <BarChart3 size={28} className="text-[#1565C0]" />
        </div>
        <h2 className="text-[#212121] font-semibold text-lg">Histórico de preços em breve</h2>
        <p className="text-[#9E9E9E] text-sm max-w-xs">
          O módulo de histórico e análise de preços estará disponível em breve.
        </p>
      </div>
    </div>
  )
}
