"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import {
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  Link2,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Banner {
  id: string
  image_url: string
  link_url: string
  title: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

const MAX_BANNERS = 5
const ACCEPTED = "image/jpeg,image/png,image/webp"
const MAX_SIZE_MB = 2

/* Dimensões recomendadas exibidas ao usuário */
const DIM_HINT = "1080 × 360 px (proporção 3:1) — JPG, PNG ou WebP, máx. 2 MB"

export default function AdminBannersPage() {
  const { data, isLoading, mutate } = useSWR<Banner[]>(
    "/api/admin/constructor/banners",
    fetcher
  )

  const banners = data ?? []

  // Estado do formulário de novo banner
  const [open,       setOpen]       = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrl,   setImageUrl]   = useState("")
  const [linkUrl,    setLinkUrl]    = useState("")
  const [title,      setTitle]      = useState("")
  const [sortOrder,  setSortOrder]  = useState<number>(banners.length)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setPreviewUrl(null)
    setImageUrl("")
    setLinkUrl("")
    setTitle("")
    setSortOrder(banners.length)
    setOpen(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB} MB`)
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/banner", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro no upload")
      setImageUrl(data.url)
      toast.success("Imagem enviada com sucesso")
    } catch (err: any) {
      toast.error(err.message)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSave() {
    if (!imageUrl) { toast.error("Envie uma imagem primeiro"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/constructor/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          link_url: linkUrl.trim(),
          title: title.trim() || null,
          sort_order: sortOrder,
        }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      toast.success("Banner adicionado")
      mutate()
      resetForm()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(b: Banner) {
    await fetch(`/api/admin/constructor/banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !b.is_active }),
    })
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este banner?")) return
    await fetch(`/api/admin/constructor/banners/${id}`, { method: "DELETE" })
    toast.success("Banner removido")
    mutate()
  }

  async function handleOrderChange(id: string, newOrder: number) {
    await fetch(`/api/admin/constructor/banners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort_order: newOrder }),
    })
    mutate()
  }

  const isExternal = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://")

  return (
    <div className="p-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Banners da Tela Inicial</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Exibidos no carrossel abaixo dos atalhos rápidos. Máximo de {MAX_BANNERS} banners ativos.
          </p>
        </div>
        <button
          onClick={() => { setOpen(true); setSortOrder(banners.length) }}
          disabled={banners.length >= MAX_BANNERS}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
            banners.length >= MAX_BANNERS
              ? "bg-white/10 text-white/30 cursor-not-allowed"
              : "bg-[#1565C0] hover:bg-[#1976D2] text-white"
          }`}
        >
          <Plus size={16} />
          Novo banner
        </button>
      </div>

      {/* Dica de dimensões */}
      <div className="flex items-start gap-2.5 bg-[#1565C0]/10 border border-[#1565C0]/30 rounded-lg px-4 py-3 mb-6">
        <Info size={16} className="text-[#64B5F6] mt-0.5 shrink-0" />
        <p className="text-xs text-white/70 leading-relaxed">
          <span className="text-white font-semibold">Dimensões recomendadas:</span>{" "}
          {DIM_HINT}
        </p>
      </div>

      {/* Formulário de novo banner */}
      {open && (
        <div className="bg-[#0D1B3E] border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-white mb-4">Novo banner</h2>

          {/* Upload de imagem */}
          <div className="mb-4">
            <label className="block text-xs text-white/50 mb-2">
              Imagem <span className="text-red-400">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors overflow-hidden group ${
                previewUrl ? "border-[#1565C0]" : "border-white/20 hover:border-white/40"
              }`}
              style={{ aspectRatio: "3/1" }}
            >
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Upload size={24} className="text-white/30" />
                  <p className="text-xs text-white/40">Clique para enviar a imagem</p>
                  <p className="text-[11px] text-white/25">{DIM_HINT}</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* URL de destino */}
          <div className="mb-3">
            <label className="block text-xs text-white/50 mb-1.5">
              URL de destino
            </label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="/dashboard/vitrine  ou  https://site.com"
                className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <p className="text-[11px] text-white/30 mt-1">
              Caminhos internos como <code className="text-white/50">/dashboard/vitrine</code> abrem na mesma aba.
              Links com <code className="text-white/50">http(s)://</code> abrem em nova aba.
            </p>
          </div>

          {/* Título (alt text) */}
          <div className="mb-3">
            <label className="block text-xs text-white/50 mb-1.5">
              Título / descrição <span className="text-white/25">(opcional — usado como alt text)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex: Promoção de insumos — Junho 2025"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          {/* Ordem */}
          <div className="mb-5">
            <label className="block text-xs text-white/50 mb-1.5">Posição (ordem)</label>
            <input
              type="number"
              min={0}
              max={MAX_BANNERS - 1}
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-24 bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || uploading || !imageUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Salvar banner
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de banners */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-white/30" />
        </div>
      )}

      {!isLoading && banners.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <ImageIcon size={32} className="text-white/20" />
          <p className="text-sm text-white/40">Nenhum banner cadastrado.</p>
          <p className="text-xs text-white/25">Clique em "Novo banner" para começar.</p>
        </div>
      )}

      {banners.length > 0 && (
        <div className="flex flex-col gap-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 bg-[#0D1B3E] border rounded-xl p-3 transition-colors ${
                b.is_active ? "border-white/10" : "border-white/5 opacity-60"
              }`}
            >
              {/* Drag handle visual */}
              <div className="shrink-0 cursor-grab text-white/20 hover:text-white/50 transition-colors">
                <GripVertical size={18} />
              </div>

              {/* Thumbnail */}
              <div
                className="shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10"
                style={{ width: 120, height: 40 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url}
                  alt={b.title ?? `Banner`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {b.title ?? "Sem título"}
                </p>
                {b.link_url ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    {isExternal(b.link_url) ? (
                      <ExternalLink size={11} className="text-white/30 shrink-0" />
                    ) : (
                      <Link2 size={11} className="text-white/30 shrink-0" />
                    )}
                    <p className="text-xs text-white/40 truncate">{b.link_url}</p>
                  </div>
                ) : (
                  <p className="text-xs text-white/25 mt-0.5">Sem link</p>
                )}
              </div>

              {/* Ordem */}
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-white/30">Ordem</p>
                <input
                  type="number"
                  min={0}
                  max={MAX_BANNERS - 1}
                  defaultValue={b.sort_order}
                  onBlur={e => handleOrderChange(b.id, Number(e.target.value))}
                  className="w-12 text-center bg-white/5 border border-white/15 rounded text-xs text-white py-1 focus:outline-none focus:border-[#1565C0]"
                />
              </div>

              {/* Toggle ativo */}
              <button
                onClick={() => handleToggle(b)}
                className={`shrink-0 transition-colors ${
                  b.is_active ? "text-[#4CAF50]" : "text-white/25"
                }`}
                title={b.is_active ? "Desativar" : "Ativar"}
              >
                {b.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>

              {/* Excluir */}
              <button
                onClick={() => handleDelete(b.id)}
                className="shrink-0 text-white/25 hover:text-red-400 transition-colors"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <p className="text-xs text-white/25 text-right">
            {banners.length}/{MAX_BANNERS} banners cadastrados
          </p>
        </div>
      )}
    </div>
  )
}
