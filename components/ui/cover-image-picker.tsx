"use client"

import { useRef, useState, useCallback } from "react"
import { Camera, X, Move, Loader2 } from "lucide-react"

interface CoverImagePickerProps {
  value: string        // URL da imagem salva
  objectPosition: string // ex: "50% 30%"
  onChange: (url: string) => void
  onPositionChange: (pos: string) => void
}

export function CoverImagePicker({ value, objectPosition, onChange, onPositionChange }: CoverImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Converte "50% 30%" → { x: 50, y: 30 }
  const parsePos = (pos: string) => {
    const [x, y] = pos.replace(/%/g, "").split(" ").map(Number)
    return { x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y }
  }

  const dragState = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!value) return
    e.preventDefault()
    const { x, y } = parsePos(objectPosition)
    dragState.current = { startX: e.clientX, startY: e.clientY, posX: x, posY: y }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [value, objectPosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragState.current.startX) / rect.width) * 100
    const dy = ((e.clientY - dragState.current.startY) / rect.height) * 100
    const newX = Math.min(100, Math.max(0, dragState.current.posX - dx))
    const newY = Math.min(100, Math.max(0, dragState.current.posY - dy))
    onPositionChange(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`)
  }, [onPositionChange])

  const handlePointerUp = useCallback(() => {
    dragState.current = null
    setDragging(false)
  }, [])

  async function handleFile(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/obra-capa", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Falha no upload")
      onChange(data.url)
      onPositionChange("50% 50%")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-[#E0E0E0] hover:border-[#1565C0] transition-colors"
      style={{ height: 160 }}
    >
      {value ? (
        <>
          {/* Imagem reposicionável via drag */}
          <div
            className={`absolute inset-0 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={value}
              alt="Capa"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition }}
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          {/* Hint de arrastar */}
          {!dragging && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 text-white rounded-full px-3 py-1 pointer-events-none"
              style={{ fontSize: "0.7rem" }}>
              <Move size={11} /> Arraste para reposicionar
            </div>
          )}

          {/* Botão trocar foto */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white rounded-full px-3 py-1 hover:bg-black/70 transition-colors"
            style={{ fontSize: "0.7rem" }}
          >
            <Camera size={12} /> Trocar foto
          </button>

          {/* Botão remover */}
          <button
            type="button"
            onClick={() => { onChange(""); onPositionChange("50% 50%") }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Remover foto"
          >
            <X size={14} className="text-white" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
        >
          {uploading
            ? <><Loader2 size={24} className="animate-spin" /><span style={{ fontSize: "0.8rem" }}>Enviando...</span></>
            : <><Camera size={24} /><span style={{ fontSize: "0.8rem" }}>Toque para adicionar foto de capa</span></>}
        </button>
      )}

      {/* Overlay de upload em andamento quando já tem imagem */}
      {uploading && value && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }}
      />
    </div>
  )
}
