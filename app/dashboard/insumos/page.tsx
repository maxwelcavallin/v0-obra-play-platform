"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Plus, X, Loader2, Package, AlertCircle, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { authFetch } from "@/lib/auth-fetch"
import { INSUMOS_SISTEMA, UNITS, CATEGORIES, type InsumoMock } from "@/lib/insumos-mock"
import { OpInput } from "@/components/ui/op-input"
import { toast } from "sonner"

type Tab = "Biblioteca padrão" | "Meus insumos"

interface Insumo {
  id: string
  name: string
  unit: string
  category: string
  origin: string
  internal_code?: string
  description?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  "Alvenaria": "#795548", "Cimento": "#607D8B", "Elétrico": "#FFC107",
  "Hidráulico": "#2196F3", "Pintura": "#E91E63", "Acabamento": "#9C27B0",
  "Madeira": "#8BC34A", "Ferragem": "#FF5722", "Cobertura": "#F44336",
  "Impermeabilização": "#00BCD4", "Fundação": "#FF9800", "Estrutura": "#3F51B5",
  "Esquadria": "#009688", "Gesso": "#BDBDBD", "Piso": "#795548",
  "Revestimento": "#673AB7",
}

function CategoryChip({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? "#9E9E9E"
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0" style={{ color, backgroundColor: `${color}18` }}>
      {category}
    </span>
  )
}

interface FormState {
  name: string
  unit: string
  category: string
  internal_code: string
  description: string
}

const EMPTY_FORM: FormState = { name: "", unit: "", category: "", internal_code: "", description: "" }

export default function InsumosPage() {
  const { activeCompany } = useAuth()
  const [tab, setTab] = useState<Tab>("Biblioteca padrão")
  const [search, setSearch] = useState("")
  const [meusInsumos, setMeusInsumos] = useState<Insumo[]>([])
  const [loadingMeus, setLoadingMeus] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Detecção de similares
  const [similarWarning, setSimilarWarning] = useState<InsumoMock[]>([])
  const [showSimilar, setShowSimilar] = useState(false)
  const nameBlurTimeout = useRef<NodeJS.Timeout | null>(null)

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  useEffect(() => {
    if (tab === "Meus insumos" && activeCompany?.id) {
      setLoadingMeus(true)
      authFetch(`/api/insumos?company_id=${activeCompany.id}&tab=meus`)
        .then((r) => r.json())
        .then((d) => setMeusInsumos(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoadingMeus(false))
    }
  }, [tab, activeCompany?.id])

  const sistemaFiltered = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return INSUMOS_SISTEMA
    return INSUMOS_SISTEMA.filter((i) =>
      normalize(i.name).includes(q) || normalize(i.category).includes(q) || normalize(i.unit).includes(q)
    )
  }, [search])

  const meusFiltered = useMemo(() => {
    const q = normalize(search.trim())
    if (!q) return meusInsumos
    return meusInsumos.filter((i) =>
      normalize(i.name).includes(q) || normalize(i.category).includes(q)
    )
  }, [search, meusInsumos])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n })
  }

  function checkSimilars(name: string) {
    if (!name.trim() || name.trim().length < 3) { setSimilarWarning([]); setShowSimilar(false); return }
    const q = normalize(name)
    const all = [...INSUMOS_SISTEMA, ...meusInsumos.map((i) => ({ ...i, origin: "Personalizado" as const }))]
    const found = all.filter((i) => {
      const n = normalize(i.name)
      return n.includes(q) || q.includes(n.slice(0, Math.max(4, n.length - 3)))
    }).slice(0, 4)
    if (found.length > 0) { setSimilarWarning(found as InsumoMock[]); setShowSimilar(true) }
    else { setSimilarWarning([]); setShowSimilar(false) }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Nome obrigatório"
    if (!form.unit) e.unit = "Unidade obrigatória"
    if (!form.category) e.category = "Categoria obrigatória"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    if (!activeCompany?.id) { toast.error("Selecione uma empresa"); return }
    setSaving(true)
    try {
      const res = await authFetch("/api/insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, company_id: activeCompany.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      setMeusInsumos((p) => [data, ...p])
      setForm(EMPTY_FORM)
      setSimilarWarning([])
      setShowSimilar(false)
      setShowForm(false)
      setTab("Meus insumos")
      toast.success("Insumo cadastrado com sucesso!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const currentList = tab === "Biblioteca padrão" ? sistemaFiltered : meusFiltered

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#EEEEEE] flex items-center px-3 flex-shrink-0" style={{ height: 52 }}>
        <span className="font-medium text-[#212121]" style={{ fontSize: "1rem" }}>Insumos</span>
        <span className="ml-2 op-chip op-chip-neutral">{tab === "Biblioteca padrão" ? INSUMOS_SISTEMA.length : meusInsumos.length}</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#EEEEEE] flex-shrink-0">
        {(["Biblioteca padrão", "Meus insumos"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-[#1565C0] border-b-2 border-[#1565C0]" : "text-[#9E9E9E]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="op-search-bar flex-shrink-0">
        <Search size={18} className="text-[#9E9E9E] flex-shrink-0" />
        <input
          className="op-search-input"
          placeholder="Buscar por nome, categoria ou unidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Limpar">
            <X size={16} className="text-[#9E9E9E]" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 px-3 pb-24 flex flex-col gap-2 pt-2">
        {tab === "Meus insumos" && loadingMeus && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#1565C0]" />
          </div>
        )}
        {!loadingMeus && currentList.length === 0 && (
          <div className="text-center py-12 text-[#9E9E9E] text-sm">
            {tab === "Meus insumos" ? "Nenhum insumo personalizado ainda" : "Nenhum resultado encontrado"}
          </div>
        )}
        {!loadingMeus && currentList.map((insumo) => (
          <div key={insumo.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${CATEGORY_COLORS[insumo.category] ?? "#9E9E9E"}18` }}
            >
              <Package size={16} style={{ color: CATEGORY_COLORS[insumo.category] ?? "#9E9E9E" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[#212121] truncate text-sm">{insumo.name}</span>
                {insumo.origin === "Personalizado" && (
                  <span className="text-xs text-[#1565C0] bg-[#E3F2FD] rounded-full px-2 py-0.5 flex-shrink-0">Meu</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <CategoryChip category={insumo.category} />
                <span className="text-xs text-[#9E9E9E]">{insumo.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      {tab === "Meus insumos" && (
        <button
          onClick={() => setShowForm(true)}
          className="op-fab fixed bottom-6 right-4 z-20"
          aria-label="Novo insumo"
        >
          <Plus size={24} className="text-white" />
        </button>
      )}

      {/* Bottom sheet — Formulário */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[92vh]">
            {/* Header sheet */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#EEEEEE] flex-shrink-0">
              <h2 className="font-semibold text-[#212121]" style={{ fontSize: "1rem" }}>Novo insumo</h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setSimilarWarning([]); setShowSimilar(false) }}>
                <X size={20} className="text-[#757575]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
              {/* Nome com detecção de similares */}
              <div>
                <OpInput
                  label="Nome*"
                  value={form.name}
                  onChange={(e) => { set("name", e.target.value); setSimilarWarning([]); setShowSimilar(false) }}
                  onBlur={() => { nameBlurTimeout.current = setTimeout(() => checkSimilars(form.name), 200) }}
                  placeholder="Ex: Cimento CP-II 50kg"
                  error={errors.name}
                />

                {/* Card de aviso de similares */}
                {showSimilar && similarWarning.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[#FFC107] bg-[#FFFDE7] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={15} className="text-[#F9A825] flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#F57F17]">Encontramos itens parecidos</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {similarWarning.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-[#FFF9C4]">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#212121] truncate">{s.name}</p>
                            <p className="text-[10px] text-[#9E9E9E]">{s.category} · {s.unit}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForm({ name: s.name, unit: s.unit, category: s.category, internal_code: "", description: s.description ?? "" })
                              setShowSimilar(false)
                              setSimilarWarning([])
                            }}
                            className="flex-shrink-0 flex items-center gap-1 text-xs text-[#1565C0] font-semibold border border-[#1565C0] rounded-full px-2 py-0.5"
                          >
                            <Check size={11} /> Usar este
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSimilar(false)}
                      className="mt-2 text-xs text-[#757575] underline w-full text-center"
                    >
                      Criar mesmo assim
                    </button>
                  </div>
                )}
              </div>

              {/* Unidade */}
              <div>
                <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Unidade de medida*</label>
                <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className="op-input-underline w-full">
                  <option value="">Selecione</option>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
              </div>

              {/* Categoria */}
              <div>
                <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Categoria*</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className="op-input-underline w-full">
                  <option value="">Selecione</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              <OpInput label="Código interno" value={form.internal_code} onChange={(e) => set("internal_code", e.target.value)} placeholder="Opcional" />

              <div>
                <label className="text-[#9E9E9E] block mb-1" style={{ fontSize: "0.75rem" }}>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Opcional — detalhes adicionais"
                  rows={2}
                  className="w-full border border-[#E0E0E0] rounded-lg resize-none outline-none text-[#212121] placeholder:text-[#9E9E9E] transition-colors focus:border-[#1565C0]"
                  style={{ fontSize: "0.875rem", padding: "8px 12px" }}
                />
              </div>
            </div>

            <div className="flex-shrink-0 bg-white border-t border-[#EEEEEE]" style={{ padding: "12px 16px 24px" }}>
              <button onClick={handleSave} disabled={saving} className="op-btn-primary">
                {saving ? <><Loader2 size={16} className="animate-spin mr-2" />Salvando...</> : "SALVAR INSUMO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
