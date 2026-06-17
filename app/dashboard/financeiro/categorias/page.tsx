"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface Categoria {
  id: string
  name: string
  type: "receita" | "despesa"
  color: string | null
  usage_count: number
}

const COLORS = [
  "#1565C0", "#4CAF50", "#F44336", "#FF9800", "#9C27B0",
  "#00BCD4", "#607D8B", "#795548", "#E91E63", "#009688",
]

function ColorDot({ color }: { color: string | null }) {
  return (
    <span className="inline-block w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color ?? "#BDBDBD" }} />
  )
}

export default function CategoriasPage() {
  const router = useRouter()
  const { activeCompany } = useAuth()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<"receita" | "despesa">("despesa")

  // Form nova/editar
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [formName, setFormName]     = useState("")
  const [formType, setFormType]     = useState<"receita" | "despesa">("despesa")
  const [formColor, setFormColor]   = useState(COLORS[0])
  const [saving, setSaving]         = useState(false)

  // Excluir
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const fetchCats = useCallback(async () => {
    if (!activeCompany?.id) return
    setLoading(true)
    try {
      const res  = await authFetch(`/api/financeiro/categorias?company_id=${activeCompany.id}`)
      const data = await res.json()
      console.log("[categorias] carregadas:", Array.isArray(data) ? data.length : data)
      setCategorias(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[categorias] erro ao carregar:", err)
      toast.error("Erro ao carregar categorias")
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => { fetchCats() }, [fetchCats])

  function openNew() {
    setEditId(null)
    setFormName("")
    setFormType(tab)
    setFormColor(COLORS[0])
    setShowForm(true)
  }

  function openEdit(cat: Categoria) {
    setEditId(cat.id)
    setFormName(cat.name)
    setFormType(cat.type)
    setFormColor(cat.color ?? COLORS[0])
    setShowForm(true)
  }

  async function handleSave() {
    if (!activeCompany?.id || !formName.trim()) {
      toast.error("Informe o nome da categoria")
      return
    }
    setSaving(true)
    try {
      const body  = { company_id: activeCompany.id, name: formName.trim(), type: formType, color: formColor }
      const url   = editId ? `/api/financeiro/categorias/${editId}` : "/api/financeiro/categorias"
      const method = editId ? "PUT" : "POST"
      const res   = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data  = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      toast.success(editId ? "Categoria atualizada!" : "Categoria criada!")
      setShowForm(false)
      fetchCats()
    } catch (err: any) {
      console.error("[categorias] erro ao salvar:", err)
      toast.error(err?.message ?? "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/financeiro/categorias/${deleteId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao excluir")
      toast.success("Categoria excluída")
      setDeleteId(null)
      fetchCats()
    } catch (err: any) {
      console.error("[categorias] erro ao excluir:", err)
      toast.error(err?.message ?? "Erro ao excluir")
    } finally {
      setDeleting(false)
    }
  }

  const filtradas = categorias.filter(c => c.type === tab)
  const catToDelete = categorias.find(c => c.id === deleteId)

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Modal excluir */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: 480 }}>
            <div className="px-5 pt-5 pb-3 border-b border-[#F5F5F5]">
              <h2 className="font-bold text-[#212121] text-base">Excluir categoria</h2>
              <p className="text-xs text-[#9E9E9E] mt-1">
                {catToDelete?.usage_count
                  ? `Não é possível excluir: ${catToDelete.usage_count} transação(ões) vinculadas.`
                  : `Excluir "${catToDelete?.name}"? Esta ação não pode ser desfeita.`}
              </p>
            </div>
            <div className="px-5 py-4 flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-[#E0E0E0] text-sm text-[#616161] font-medium">
                Fechar
              </button>
              {!catToDelete?.usage_count && (
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-[#F44336] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer form nova/editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: 480 }}>
            <div className="px-5 pt-4 pb-3 border-b border-[#F5F5F5] flex items-center justify-between">
              <h2 className="font-bold text-[#212121]">{editId ? "Editar categoria" : "Nova categoria"}</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-[#9E9E9E]" />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Nome */}
              <div>
                <p className="text-xs text-[#9E9E9E] mb-1">Nome *</p>
                <input
                  className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1565C0]"
                  placeholder="Ex: Material de obra, Serviços, Aluguel..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              {/* Tipo */}
              <div>
                <p className="text-xs text-[#9E9E9E] mb-2">Tipo *</p>
                <div className="flex gap-2">
                  {(["despesa", "receita"] as const).map(t => (
                    <button key={t} onClick={() => setFormType(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        formType === t
                          ? t === "receita" ? "bg-[#E8F5E9] border-[#4CAF50] text-[#388E3C]" : "bg-[#FFEBEE] border-[#F44336] text-[#D32F2F]"
                          : "border-[#E0E0E0] text-[#9E9E9E]"
                      }`}>
                      {t === "receita" ? "Receita" : "Despesa"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cor */}
              <div>
                <p className="text-xs text-[#9E9E9E] mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: formColor === c ? "#212121" : "transparent" }}>
                      {formColor === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#1565C0] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? "Salvando..." : editId ? "Salvar alterações" : "Criar categoria"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1565C0] px-4 pt-4 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1">Categorias</h1>
        <button onClick={openNew}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 py-3">
        {(["despesa", "receita"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === t ? "bg-[#1565C0] text-white" : "bg-white text-[#757575] shadow-sm"
            }`}>
            {t === "despesa" ? "Despesas" : "Receitas"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 flex flex-col gap-2 pb-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loading && filtradas.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#9E9E9E] text-sm mb-4">
              Nenhuma categoria de {tab === "receita" ? "receita" : "despesa"} criada
            </p>
            <button onClick={openNew}
              className="px-5 py-2.5 bg-[#1565C0] text-white text-sm font-semibold rounded-full">
              Criar categoria
            </button>
          </div>
        )}
        {!loading && filtradas.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
            <ColorDot color={cat.color} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#212121] truncate">{cat.name}</p>
              <p className="text-xs text-[#9E9E9E]">
                {cat.usage_count > 0 ? `${cat.usage_count} transação(ões)` : "Sem transações"}
              </p>
            </div>
            <button onClick={() => openEdit(cat)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5]">
              <Pencil size={14} className="text-[#757575]" />
            </button>
            <button onClick={() => setDeleteId(cat.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FFEBEE]">
              <Trash2 size={14} className="text-[#F44336]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
