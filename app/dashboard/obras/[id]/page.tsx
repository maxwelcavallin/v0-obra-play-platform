"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft, Loader2, MapPin, Ruler, Calendar, HardHat,
  Pencil, PowerOff, FileText, ImageIcon, FileSpreadsheet,
  File, Download, Trash2, Upload, X, Plus,
} from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { toast } from "sonner"

interface Obra {
  id: string; name: string; status: string; type?: string; area_m2?: number
  start_date?: string; expected_end_date?: string; is_own: boolean
  client_name?: string; client_type?: string; cover_url?: string; cover_position?: string
  delivery_street?: string; delivery_number?: string; delivery_complement?: string
  delivery_neighbourhood?: string; delivery_city?: string; delivery_state?: string; delivery_zipcode?: string
  same_billing_address: boolean
  billing_street?: string; billing_number?: string; billing_complement?: string
  billing_neighbourhood?: string; billing_city?: string; billing_state?: string; billing_zipcode?: string
  notes?: string
}

interface Documento {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size?: number
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Em andamento": { label: "Em andamento", color: "#4CAF50", bg: "#E8F5E9" },
  "Orçamento":    { label: "Orçamento",    color: "#1565C0", bg: "#E3F2FD" },
  "Pausada":      { label: "Pausada",      color: "#FF9800", bg: "#FFF3E0" },
  "Concluída":    { label: "Concluída",    color: "#757575", bg: "#F5F5F5" },
  "Inativa":      { label: "Inativa",      color: "#F44336", bg: "#FFEBEE" },
  "Cancelada":    { label: "Cancelada",    color: "#F44336", bg: "#FFEBEE" },
}

const TABS = ["Geral", "Documentos", "Cotações", "OCs", "Financeiro"] as const
type Tab = typeof TABS[number]

// Detecta tipo do arquivo pela extensão
function detectFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(ext)) return "image"
  if (["doc", "docx"].includes(ext)) return "word"
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel"
  return "other"
}

function DocIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type === "pdf")   return <FileText size={size} className="text-red-500" />
  if (type === "image") return <ImageIcon size={size} className="text-blue-400" />
  if (type === "word")  return <FileText size={size} className="text-blue-800" />
  if (type === "excel") return <FileSpreadsheet size={size} className="text-green-600" />
  return <File size={size} className="text-[#757575]" />
}

function formatBytes(bytes?: number) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col py-2.5 border-b border-[#F5F5F5] last:border-0">
      <span className="text-xs text-[#9E9E9E]">{label}</span>
      <span className="text-sm text-[#212121] mt-0.5">{value}</span>
    </div>
  )
}

function AddressBlock({ prefix, obra }: { prefix: "delivery" | "billing"; obra: Obra }) {
  const street = obra[`${prefix}_street`]
  const number = obra[`${prefix}_number`]
  const complement = obra[`${prefix}_complement`]
  const neighbourhood = obra[`${prefix}_neighbourhood`]
  const city = obra[`${prefix}_city`]
  const state = obra[`${prefix}_state`]
  const zipcode = obra[`${prefix}_zipcode`]
  if (!street && !city) return <p className="text-sm text-[#9E9E9E]">Não informado</p>
  const line1 = [street, number, complement].filter(Boolean).join(", ")
  const line2 = [neighbourhood, city, state].filter(Boolean).join(", ")
  return (
    <div>
      {line1 && <p className="text-sm text-[#212121]">{line1}</p>}
      {line2 && <p className="text-sm text-[#757575]">{line2}</p>}
      {zipcode && <p className="text-xs text-[#9E9E9E] mt-0.5">CEP: {zipcode}</p>}
    </div>
  )
}

const DOC_TYPES = [
  { value: "Planta",    label: "Planta" },
  { value: "Contrato",  label: "Contrato" },
  { value: "Laudo",     label: "Laudo" },
  { value: "Alvará",    label: "Alvará" },
  { value: "Outro",     label: "Outro" },
]

// --- Aba Documentos ---
function TabDocumentos({ obraId }: { obraId: string }) {
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docName, setDocName] = useState("")
  const [docType, setDocType] = useState("Outro")
  const [docNameError, setDocNameError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dropDragging, setDropDragging] = useState(false)

  useEffect(() => {
    authFetch(`/api/obras/${obraId}/documentos`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setDocs(data) : setDocs([]))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [obraId])

  function openModal() {
    setSelectedFile(null)
    setDocName("")
    setDocType("Outro")
    setDocNameError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowModal(true)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setSelectedFile(f)
      // Pré-preenche o nome com o nome do arquivo (sem extensão) se ainda não digitou
      if (!docName.trim()) {
        setDocName(f.name.replace(/\.[^.]+$/, ""))
      }
    }
  }

  async function handleUpload() {
    if (!selectedFile) { toast.error("Selecione um arquivo"); return }
    if (!docName.trim()) { setDocNameError("Nome obrigatório"); return }
    setDocNameError("")
    setUploading(true)
    try {
      // 1. Upload do arquivo para o Blob
      const fd = new FormData()
      fd.append("file", selectedFile)
      const upRes = await fetch("/api/upload/obra-documento", { method: "POST", body: fd })
      const upData = await upRes.json()
      if (!upRes.ok) throw new Error(upData.error ?? "Falha no upload")

      // 2. Salva o documento no banco
      const fileType = detectFileType(selectedFile.name)
      const saveRes = await authFetch(`/api/obras/${obraId}/documentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName.trim(),
          file_url: upData.url,
          file_type: fileType,
          doc_type: docType,
          file_size: selectedFile.size,
        }),
      })
      const saved = await saveRes.json()
      if (!saveRes.ok) throw new Error(saved.error ?? "Erro ao salvar")

      setDocs((prev) => [saved, ...prev])
      setShowModal(false)
      setSelectedFile(null)
      setDocName("")
      toast.success("Documento adicionado com sucesso!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: Documento) {
    try {
      const res = await fetch(doc.file_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao baixar documento.")
    }
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`Excluir "${doc.name}"?`)) return
    setDeletingId(doc.id)
    try {
      const res = await authFetch(`/api/obras/${obraId}/documentos/${doc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir")
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success("Documento excluído.")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-[#1565C0]" />
    </div>
  )

  return (
    <>
      {/* Input oculto - sempre montado */}
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
        onChange={handleFileSelect} />

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#212121]">
          {docs.length} {docs.length === 1 ? "documento" : "documentos"}
        </p>
        <button onClick={openModal}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#1565C0] text-white text-xs font-semibold hover:bg-[#1255A8] transition-colors">
          <Plus size={13} /> Adicionar
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#E3F2FD] flex items-center justify-center">
            <FileText size={26} className="text-[#1565C0]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#424242]">Nenhum documento cadastrado</p>
            <p className="text-xs text-[#9E9E9E] mt-1">Adicione PDFs, imagens, planilhas ou contratos</p>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#1565C0] text-white text-sm font-semibold hover:bg-[#1255A8] transition-colors mt-1">
            <Upload size={14} /> Adicionar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                <DocIcon type={doc.file_type} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-[#212121] truncate max-w-[140px]">{doc.name}</p>
                  {(doc as any).doc_type && (doc as any).doc_type !== "Outro" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2FA] text-[#1565C0]">
                      {(doc as any).doc_type}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#9E9E9E] mt-0.5">
                  {formatBytes(doc.file_size)}
                  {doc.file_size ? " · " : ""}
                  {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E3F2FD] transition-colors"
                  aria-label="Baixar documento"
                >
                  <Download size={15} className="text-[#1565C0]" />
                </button>
                <button onClick={() => handleDelete(doc)} disabled={deletingId === doc.id}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FFEBEE] transition-colors"
                  aria-label="Excluir documento">
                  {deletingId === doc.id
                    ? <Loader2 size={14} className="animate-spin text-red-400" />
                    : <Trash2 size={15} className="text-red-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => !uploading && setShowModal(false)}>
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#212121]" style={{ fontSize: "1rem" }}>Enviar documento</h3>
              <button onClick={() => !uploading && setShowModal(false)} disabled={uploading}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5]">
                <X size={18} className="text-[#757575]" />
              </button>
            </div>

            {/* Campo: Nome */}
            <div className="mb-3">
              <label className="text-xs text-[#9E9E9E] font-semibold uppercase tracking-wide block mb-1">Nome *</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => { setDocName(e.target.value); if (e.target.value.trim()) setDocNameError("") }}
                placeholder="Ex: Planta baixa rev.2"
                className={`w-full text-sm text-[#212121] border rounded-xl px-3 py-2.5 outline-none transition-colors ${docNameError ? "border-[#F44336]" : "border-[#E0E0E0] focus:border-[#1565C0]"}`}
              />
              {docNameError && <p className="text-xs text-[#F44336] mt-1">{docNameError}</p>}
            </div>

            {/* Campo: Tipo */}
            <div className="mb-3">
              <label className="text-xs text-[#9E9E9E] font-semibold uppercase tracking-wide block mb-1">Tipo</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-sm text-[#212121] border border-[#E0E0E0] focus:border-[#1565C0] rounded-xl px-3 py-2.5 outline-none bg-white"
              >
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Área de seleção de arquivo — suporta click + drag-and-drop */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDropDragging(true) }}
              onDragLeave={() => setDropDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDropDragging(false)
                const f = e.dataTransfer.files?.[0]
                if (f) {
                  setSelectedFile(f)
                  if (!docName.trim()) setDocName(f.name.replace(/\.[^.]+$/, ""))
                }
              }}
              className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors cursor-pointer select-none ${
                dropDragging ? "border-[#1565C0] bg-[#E3F2FD]" : "border-[#E0E0E0] hover:border-[#1565C0]"
              } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {selectedFile ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <DocIcon type={detectFileType(selectedFile.name)} size={22} />
                  </div>
                  <p className="text-sm font-medium text-[#212121] px-4 text-center">{selectedFile.name}</p>
                  <p className="text-xs text-[#9E9E9E]">{formatBytes(selectedFile.size)} · Clique para trocar</p>
                </>
              ) : (
                <>
                  <Upload size={24} className={dropDragging ? "text-[#1565C0]" : "text-[#9E9E9E]"} />
                  <p className="text-sm text-[#9E9E9E]">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-[#BDBDBD]">PDF, JPG, PNG, DOCX, XLSX</p>
                </>
              )}
            </div>

            <button onClick={handleUpload} disabled={uploading}
              className="mt-4 w-full h-12 rounded-xl bg-[#1565C0] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-[#1255A8]">
              {uploading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Upload size={16} /> Confirmar envio</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// --- Página principal ---
export default function ObraDetalhePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>("Geral")
  const [deactivating, setDeactivating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/obras/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then((d) => { if (d) setObra(d) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDeactivate() {
    if (!confirmDeactivate) { setConfirmDeactivate(true); return }
    setDeactivating(true)
    try {
      const newStatus = isCancelled ? "Orçamento" : "Inativa"
      const res = await authFetch(`/api/obras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...obra, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setObra((prev) => prev ? { ...prev, status: newStatus } : prev)
      setConfirmDeactivate(false)
      toast.success(newStatus === "Inativa" ? "Obra inativada" : "Obra reativada")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeactivating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Loader2 size={28} className="animate-spin text-[#1565C0]" />
    </div>
  )

  if (notFound || !obra) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <p className="text-[#757575]">Obra não encontrada.</p>
    </div>
  )

  const cfg = STATUS_CONFIG[obra.status] ?? { label: obra.status, color: "#757575", bg: "#F5F5F5" }
  const location = [obra.delivery_city, obra.delivery_state].filter(Boolean).join(" - ")
  const isCancelled = obra.status === "Inativa" || obra.status === "Cancelada"

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">

      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ minHeight: 160 }}>
        {obra.cover_url ? (
          <>
            <img src={obra.cover_url} alt="Capa da obra" className="w-full object-cover"
              style={{ height: 160, objectPosition: obra.cover_position ?? "50% 50%" }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 60%, #42A5F5 100%)" }} />
            <div className="absolute -bottom-4 -right-4 opacity-10"><HardHat size={96} className="text-white" /></div>
          </>
        )}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 pt-2" style={{ height: 52 }}>
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/30 transition-colors" aria-label="Voltar">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/dashboard/obras/${id}/editar`)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold">
              <Pencil size={13} /> Editar
            </button>
            <button onClick={handleDeactivate} disabled={deactivating}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full transition-colors text-xs font-semibold ${confirmDeactivate ? "bg-red-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}>
              {deactivating ? <Loader2 size={13} className="animate-spin" /> : <PowerOff size={13} />}
              {confirmDeactivate ? "Confirmar" : isCancelled ? "Reativar" : "Inativar"}
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-white font-bold leading-tight drop-shadow" style={{ fontSize: "1.1rem" }}>{obra.name}</h1>
            <span className="rounded-full px-3 py-0.5 text-xs font-semibold flex-shrink-0"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap mt-1.5">
            {location && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><MapPin size={11} /> {location}</span>}
            {obra.area_m2 && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><Ruler size={11} /> {obra.area_m2} m²</span>}
            {obra.start_date && <span className="flex items-center gap-1 text-white/80 text-xs drop-shadow"><Calendar size={11} /> {new Date(obra.start_date).toLocaleDateString("pt-BR")}</span>}
          </div>
        </div>
      </div>

      {confirmDeactivate && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-red-700 font-medium">{isCancelled ? "Reativar esta obra?" : "Inativar esta obra?"}</p>
          <button onClick={() => setConfirmDeactivate(false)} className="text-xs text-red-500 underline">Cancelar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[#1565C0] flex flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${tab === t ? "text-white border-b-2 border-white" : "text-white/60"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {tab === "Geral" && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-[#9E9E9E] mb-2 tracking-wide">INFORMAÇÕES GERAIS</p>
              <InfoRow label="Tipo de obra" value={obra.type} />
              <InfoRow label="Cliente" value={obra.is_own ? "Obra própria" : (obra.client_name ?? "—")} />
              <InfoRow label="Status" value={obra.status} />
              <InfoRow label="Área" value={obra.area_m2 ? `${obra.area_m2} m²` : null} />
              <InfoRow label="Data de início" value={obra.start_date ? new Date(obra.start_date).toLocaleDateString("pt-BR") : null} />
              <InfoRow label="Previsão de conclusão" value={obra.expected_end_date ? new Date(obra.expected_end_date).toLocaleDateString("pt-BR") : null} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-[#9E9E9E] mb-3 tracking-wide">ENDEREÇOS</p>
              <div className="mb-3">
                <p className="text-xs font-medium text-[#757575] mb-1 flex items-center gap-1"><MapPin size={11} /> Entrega</p>
                <AddressBlock prefix="delivery" obra={obra} />
              </div>
              <div className="border-t border-[#F5F5F5] pt-3">
                <p className="text-xs font-medium text-[#757575] mb-1 flex items-center gap-1"><MapPin size={11} /> Cobrança</p>
                {obra.same_billing_address
                  ? <p className="text-sm text-[#9E9E9E]">Mesmo endereço de entrega</p>
                  : <AddressBlock prefix="billing" obra={obra} />}
              </div>
            </div>

            {obra.notes?.trim() && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs font-semibold text-[#9E9E9E] mb-2 tracking-wide">OBSERVAÇÕES</p>
                <p className="text-sm text-[#424242] whitespace-pre-wrap">{obra.notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === "Documentos" && <TabDocumentos obraId={id} />}

        {(tab === "Cotações" || tab === "OCs" || tab === "Financeiro") && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center">
              <HardHat size={22} className="text-[#1565C0]" />
            </div>
            <p className="text-sm font-semibold text-[#424242]">Em breve</p>
            <p className="text-xs text-[#9E9E9E]">Esta funcionalidade está sendo desenvolvida</p>
          </div>
        )}
      </div>
    </div>
  )
}
