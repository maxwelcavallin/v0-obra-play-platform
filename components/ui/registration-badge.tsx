import { BadgeCheck, CheckCircle, MinusCircle } from "lucide-react"

type RegistrationType = "certified" | "validated" | "basic" | null | undefined

interface RegistrationBadgeProps {
  type: RegistrationType
  /** "pill" = texto + ícone (padrão), "icon" = somente ícone com tooltip */
  variant?: "pill" | "icon"
  className?: string
}

const CONFIG = {
  certified: {
    label: "Certificado",
    Icon: BadgeCheck,
    iconColor: "#2E7D32",
    bg: "#E8F5E9",
    text: "#2E7D32",
  },
  validated: {
    label: "Validado",
    Icon: CheckCircle,
    iconColor: "#1565C0",
    bg: "#E3F2FD",
    text: "#1565C0",
  },
  basic: {
    label: "Básico",
    Icon: MinusCircle,
    iconColor: "#9E9E9E",
    bg: "#F5F5F5",
    text: "#757575",
  },
}

export function RegistrationBadge({ type, variant = "pill", className = "" }: RegistrationBadgeProps) {
  const key = type && type in CONFIG ? type : "basic"
  const { label, Icon, iconColor, bg, text } = CONFIG[key as keyof typeof CONFIG]

  if (variant === "icon") {
    return (
      <span title={label} className={`inline-flex items-center flex-shrink-0 ${className}`}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${className}`}
      style={{ background: bg, color: text }}
    >
      <Icon size={10} color={iconColor} strokeWidth={2.5} />
      {label}
    </span>
  )
}
