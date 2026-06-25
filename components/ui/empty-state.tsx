import { type LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? "py-10" : "py-16"}`}>
      <div className="w-16 h-16 rounded-full bg-[#F0F4FF] flex items-center justify-center mb-4">
        <Icon size={28} className="text-[#90A4AE]" />
      </div>
      <p className="font-semibold text-[#424242] text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[#9E9E9E] max-w-[260px] leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-full bg-[#1565C0] text-white text-sm font-semibold shadow hover:bg-[#1255A8] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
