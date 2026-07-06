"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { useRouter } from "next/navigation"
import { Package, ArrowLeft, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface CartItem {
  id: string
  item_id: string
  name: string
  unit: string
  quantity: number
  image_url?: string
}

interface Obra {
  id: string
  name: string
  status: string
}

export default function VitrineCheckoutPage() {
  const { activeCompany, user } = useAuth()
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ cotacao_id: string; identifier: string } | null>(null)

  const [obraId, setObraId] = useState("")
  const [needDate, setNeedDate] = useState("")
  const [notes, setNotes] = useState("")

  const fetchData = useCallback(async () => {
    if (!activeCompany) return
    const [cartRes, obrasRes] = await Promise.all([
      authFetch("/api/vitrine/carrinho"),
      authFetch(`/api/obras?company_id=${activeCompany.id}`),
    ])
    const [cartData, obrasData] = await Promise.all([cartRes.json(), obrasRes.json()])
    setCart(cartData.items ?? [])
    setObras((obrasData.obras ?? obrasData ?? []).filter((o: Obra) => o.status !== "Concluída"))
    setLoading(false)
  }, [activeCompany])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSubmit() {
    if (!obraId) { toast.error("Selecione uma obra"); return }
    if (!activeCompany) return
    setSubmitting(true)
    try {
      const res = await authFetch("/api/vitrine/checkout", {
        method: "POST",
        body: JSON.stringify({
          obra_id: obraId,
          company_id: activeCompany.id,
          need_date: needDate || null,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar cotação")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-[#2E7D32] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#212121] mb-1">Cotação criada!</h2>
          <p className="text-sm text-[#757575] mb-1">Identificador: <strong>{done.identifier}</strong></p>
          <p className="text-xs text-[#9E9E9E] mb-6">Agora você pode adicionar fornecedores e enviar a cotação.</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/dashboard/cotacoes/${done.cotacao_id}`)}
              className="flex-1 bg-[#1565C0] text-white font-bold py-2.5 rounded-xl hover:bg-[#1251A3] transition-colors text-sm"
            >
              Ver cotação
            </button>
            <button
              onClick={() => router.push("/dashboard/vitrine")}
              className="flex-1 border border-[#EEEEEE] text-[#616161] font-semibold py-2.5 rounded-xl hover:bg-[#F5F5F5] transition-colors text-sm"
            >
              Nova vitrine
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#616161] hover:text-[#212121] mb-5">
          <ArrowLeft size={15} />
          Voltar para vitrine
        </button>

        <h1 className="text-lg font-bold text-[#212121] mb-5">Gerar Cotação</h1>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-[#EEEEEE] animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo do carrinho */}
            <div className="bg-white rounded-xl border border-[#EEEEEE] p-4">
              <p className="text-xs font-bold text-[#757575] uppercase tracking-wide mb-3">
                {cart.length} {cart.length === 1 ? "item" : "itens"} no carrinho
              </p>
              <div className="flex flex-col gap-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 text-sm">
                    <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        : <Package size={14} className="text-[#BDBDBD]" />
                      }
                    </div>
                    <span className="flex-1 text-[#424242] truncate">{item.name}</span>
                    <span className="text-[#757575] flex-shrink-0">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário */}
            <div className="bg-white rounded-xl border border-[#EEEEEE] p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#424242] mb-1.5">Obra *</label>
                <select
                  value={obraId}
                  onChange={e => setObraId(e.target.value)}
                  className="w-full border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-sm text-[#212121] focus:outline-none focus:border-[#1565C0] bg-white"
                >
                  <option value="">Selecione uma obra</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424242] mb-1.5">Data de necessidade</label>
                <input
                  type="date"
                  value={needDate}
                  onChange={e => setNeedDate(e.target.value)}
                  className="w-full border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-sm text-[#212121] focus:outline-none focus:border-[#1565C0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424242] mb-1.5">Observações</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Informações adicionais para os fornecedores..."
                  className="w-full border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-sm text-[#212121] placeholder-[#BDBDBD] focus:outline-none focus:border-[#1565C0] resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !obraId}
              className="w-full bg-[#1565C0] text-white font-bold py-3.5 rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? "Gerando cotação..." : "Gerar Cotação"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
