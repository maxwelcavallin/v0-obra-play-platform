"use client"

import { useRef } from "react"
import { Camera } from "lucide-react"

interface OpAvatarUploadProps {
  src?: string
  initials?: string
  size?: number
  shape?: "circle" | "rounded"
  onChange?: (dataUrl: string) => void
  label?: string
}

export function OpAvatarUpload({
  src,
  initials = "?",
  size = 88,
  shape = "circle",
  onChange,
  label,
}: OpAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const radius = shape === "circle" ? "50%" : "12px"

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onChange?.(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative focus:outline-none group"
        aria-label={label ?? "Alterar foto"}
        style={{ width: size, height: size }}
      >
        {/* Avatar */}
        <div
          className="w-full h-full overflow-hidden bg-[#E3F2FD] flex items-center justify-center"
          style={{ borderRadius: radius }}
        >
          {src ? (
            <img src={src} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span
              className="text-[#1565C0] font-bold select-none"
              style={{ fontSize: size * 0.34 }}
            >
              {initials.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Camera overlay */}
        <div
          className="absolute bottom-0 right-0 bg-white rounded-full border-2 border-[#E0E0E0] flex items-center justify-center shadow-sm group-hover:bg-[#E3F2FD] transition-colors"
          style={{ width: size * 0.36, height: size * 0.36 }}
        >
          <Camera size={size * 0.18} className="text-[#1565C0]" />
        </div>
      </button>

      {label && (
        <p className="text-[#1565C0] font-medium" style={{ fontSize: "0.75rem" }}>
          {label}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
        aria-hidden
      />
    </div>
  )
}
