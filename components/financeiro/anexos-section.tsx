"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload, FileText, Image, File, X, Eye, Download, Loader2, Paperclip
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

export interface Anexo {
  id: string
  transaction_id: string
  company_id: string
  name: string
  file_type: "nota_fiscal" | "comprovante" | "boleto" | "contrato" | "outro"
  mime_type: string | null
  size_bytes: number | null
  url: string
  created_at: string
}

const FILE_TYPES = [
  { value: "nota_fiscal",  label: "Nota Fiscal" },
  { value: "comprovante",  label: "Comprovante" },
  { value: "boleto",       label: "Boleto" },
  { value: "contrato",     label: "Contrato" },
  { value: "outro",        label: "Outro" },
]

const TYPE_COLORS: Record<string, string> = {
  nota_fiscal: "#1565C0",
  comprovante: "#4CAF50",
  boleto:      "#FF9800",
  contrato:    "#9C27B0",
  outro:       "#607D8B",
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)}KB`
  return `${(bytes/(1024*1024)).toFixed(1)}MB`
}

function fmtDate(d: string) {
  const [y,m,day] = d.split("T")[0].split("-")
  return `${day}/${m}/${y}`
}

function isImage(mime: string | null) {
  return mime?.startsWith("image/") ?? false
}

function isXml(mime: string | null, name: string) {
  return mime?.includes("xml") || name?.toLowerCase().endsWith(".xml")
}

function FileIcon({ mime, name }: { mime: string | null; name: string }) {
  if (isImage(mime)) return <Image size={18} className="text-[#4CAF50]" />
  if (isXml(mime, name)) return <FileText size={18} className="text-[#FF9800]" />
  if (mime === "application/pdf") return <FileText size={18} className="text-[#F44336]" />
  return <File size={18} className="text-[#9E9E9E]" />
}

interface Props {
  transactionId: string
  companyId: string
  initialAnexos?: Anexo[]
  readOnly?: boolean
}

export function AnexosSection({ transactionId, companyId, initialAnexos = [], readOnly = false }: Props) {
  const [anexos, setAnexos]       = useState<Anexo[]>(initialAnexos)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [preview, setPreview]     = useState<Anexo | null>(null)

  // por arquivo pendente de configuração antes de upload
  const [pendingFiles, setPendingFiles] = useState<Array<{
    file: File; name: string; file_type: string
  }>>([])

  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files).map(f => ({
      file: f,
      name: f.name.replace(/\.[^.]+$/, ""),
      file_type: f.name.toLowerCase().endsWith(".xml") ? "nota_fiscal" : "outro",
    }))
    setPendingFiles(p => [...p, ...arr])
  }

  function removePending(idx: number) {
    setPendingFiles(p => p.filter((_, i) => i !== idx))
  }

  async function uploadAll() {
    if (pendingFiles.length === 0) return
    setUploading(true)
    const newAnexos: Anexo[] = []
    for (const pf of pendingFiles) {
      try {
        const fd = new FormData()
        fd.append("file", pf.file)
        fd.append("name", pf.name)
        fd.append("file_type", pf.file_type)
        fd.append("company_id", companyId)
        const res = await authFetch(`/api/financeiro/transacoes/${transactionId}/anexos`, {
          method: "POST",
          body: fd,
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(`Erro em "${pf.name}": ${err.error ?? "falha no upload"}`)
          continue
        }
        const data = await res.json()
        newAnexos.push(data)
      } catch (err: any) {
        console.error("[AnexosSection] upload err:", err?.message)
        toast.error(`Falha no upload de "${pf.name}"`)
      }
    }
    setAnexos(p => [...p, ...newAnexos])
    setPendingFiles([])
    setUploading(false)
    if (newAnexos.length > 0) toast.success(`${newAnexos.length} arquivo(s) enviado(s)`)
  }

  async function deleteAnexo(id: string) {
    try {
      await authFetch(`/api/financeiro/transacoes/${transactionId}/anexos/${id}`, { method: "DELETE" })
      setAnexos(p => p.filter(a => a.id !== id))
      toast.success("Anexo removido")
    } catch (err: any) {
      console.error("[AnexosSection] delete err:", err?.message)
      toast.error("Erro ao remover anexo")
    }
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Paperclip size={15} className="text-[#616161]" />
        <p className="font-semibold text-[#212121] text-sm">Anexos</p>
        {anexos.length > 0 && (
          <span className="text-[10px] bg-[#E3F2FD] text-[#1565C0] font-bold px-1.5 py-0.5 rounded-full">{anexos.length}</span>
        )}
      </div>

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl flex flex-col items-center gap-2 py-5 px-4 cursor-pointer transition-colors ${
            dragging ? "border-[#1565C0] bg-[#E3F2FD]" : "border-[#E0E0E0] bg-[#FAFAFA] hover:border-[#1565C0] hover:bg-[#F5F9FF]"
          }`}
        >
          <Upload size={24} className={dragging ? "text-[#1565C0]" : "text-[#BDBDBD]"} />
          <p className="text-xs text-[#616161] text-center">
            Arraste arquivos ou <span className="text-[#1565C0] font-semibold">clique para selecionar</span>
          </p>
          <p className="text-[10px] text-[#9E9E9E]">PDF, JPG, PNG, XML (NF-e) — máx 10MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xml" multiple className="hidden"
            onChange={e => addFiles(e.target.files)} />
        </div>
      )}

      {/* Empty state */}
      {!readOnly && anexos.length === 0 && pendingFiles.length === 0 && (
        <p className="text-xs text-[#9E9E9E] text-center">Adicione notas fiscais, comprovantes e boletos.</p>
      )}

      {/* Arquivos pendentes */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#616161]">Aguardando envio</p>
          {pendingFiles.map((pf, idx) => (
            <div key={idx} className="bg-[#FFF8E1] rounded-xl px-3 py-2.5 flex items-center gap-2">
              <FileText size={16} className="text-[#FF9800] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex gap-2">
                <input value={pf.name} onChange={e => setPendingFiles(p => p.map((f,i) => i===idx?{...f,name:e.target.value}:f))}
                  className="flex-1 text-xs text-[#212121] outline-none bg-transparent border-b border-[#FFD54F] min-w-0" placeholder="Nome" />
                <select value={pf.file_type} onChange={e => setPendingFiles(p => p.map((f,i) => i===idx?{...f,file_type:e.target.value}:f))}
                  className="text-[10px] text-[#212121] bg-transparent outline-none border border-[#E0E0E0] rounded-lg px-1">
                  {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <button onClick={() => removePending(idx)} className="text-[#9E9E9E] hover:text-[#F44336]"><X size={14} /></button>
            </div>
          ))}
          <button onClick={uploadAll} disabled={uploading}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#0D47A1] disabled:opacity-60 transition-colors">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Enviando..." : `Enviar ${pendingFiles.length} arquivo(s)`}
          </button>
        </div>
      )}

      {/* Lista de anexos existentes */}
      {anexos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {anexos.map(a => (
            <div key={a.id} className="bg-white border border-[#F0F0F0] rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
              {/* Preview thumbnail se imagem */}
              {isImage(a.mime_type) ? (
                <button onClick={() => setPreview(a)} className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-[#F5F5F5]">
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                  <FileIcon mime={a.mime_type} name={a.name} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-medium text-[#212121] truncate max-w-[120px]">{a.name}</p>
                  {isXml(a.mime_type, a.name) && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100]">NF-e</span>
                  )}
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: TYPE_COLORS[a.file_type] ?? "#9E9E9E" }}>
                    {FILE_TYPES.find(t => t.value === a.file_type)?.label ?? a.file_type}
                  </span>
                </div>
                <p className="text-[10px] text-[#9E9E9E]">{fmtDate(a.created_at)}{a.size_bytes ? ` · ${fmtSize(a.size_bytes)}` : ""}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isImage(a.mime_type) && (
                  <button onClick={() => setPreview(a)} className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#E3F2FD] transition-colors">
                    <Eye size={13} className="text-[#616161]" />
                  </button>
                )}
                <a href={a.url} download={a.name} target="_blank" rel="noreferrer"
                  className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#E3F2FD] transition-colors">
                  <Download size={13} className="text-[#616161]" />
                </a>
                {!readOnly && (
                  <button onClick={() => deleteAnexo(a.id)} className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#FFEBEE] transition-colors">
                    <X size={13} className="text-[#9E9E9E] hover:text-[#F44336]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal de imagem */}
      {preview && isImage(preview.mime_type) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img src={preview.url} alt={preview.name} className="max-w-[90vw] max-h-[80vh] rounded-2xl object-contain" />
            <button onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
              <X size={16} className="text-[#212121]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
