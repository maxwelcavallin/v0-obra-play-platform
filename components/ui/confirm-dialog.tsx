"use client"

import { Loader2, AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Ícone */}
          <div className="flex flex-col items-center pt-6 pb-4 px-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              destructive ? "bg-[#FEF2F2]" : "bg-[#EEF2FA]"
            }`}>
              <AlertTriangle
                size={22}
                className={destructive ? "text-[#D32F2F]" : "text-[#1565C0]"}
              />
            </div>

            <p className="font-bold text-[#212121] text-base text-center text-balance">{title}</p>

            {description && (
              <p className="text-sm text-[#616161] text-center mt-1 leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 px-4 pb-5">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-[#E0E0E0] text-[#616161] text-sm font-semibold hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 ${
                destructive
                  ? "bg-[#D32F2F] hover:bg-[#B71C1C]"
                  : "bg-[#1565C0] hover:bg-[#0D47A1]"
              }`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Aguarde..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
