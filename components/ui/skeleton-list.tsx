interface SkeletonCardProps {
  lines?: number
  hasAvatar?: boolean
  hasTag?: boolean
}

function SkeletonCard({ lines = 2, hasAvatar = true, hasTag = false }: SkeletonCardProps) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 flex items-start gap-3 animate-pulse shadow-sm">
      {hasAvatar && (
        <div className="w-10 h-10 rounded-full bg-[#EEEEEE] flex-shrink-0" />
      )}
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3.5 bg-[#EEEEEE] rounded w-2/3" />
        {lines >= 2 && <div className="h-2.5 bg-[#EEEEEE] rounded w-1/2" />}
        {lines >= 3 && <div className="h-2.5 bg-[#EEEEEE] rounded w-1/3" />}
      </div>
      {hasTag && (
        <div className="h-5 w-16 bg-[#EEEEEE] rounded-full flex-shrink-0" />
      )}
    </div>
  )
}

interface SkeletonListProps {
  count?: number
  lines?: number
  hasAvatar?: boolean
  hasTag?: boolean
  className?: string
}

export function SkeletonList({ count = 4, lines = 2, hasAvatar = true, hasTag = false, className = "" }: SkeletonListProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} hasAvatar={hasAvatar} hasTag={hasTag} />
      ))}
    </div>
  )
}

// Skeleton para tabelas / linhas finas
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-[#F5F5F5] animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-3 bg-[#EEEEEE] rounded w-1/2" />
            <div className="h-2.5 bg-[#EEEEEE] rounded w-1/3" />
          </div>
          <div className="h-4 w-14 bg-[#EEEEEE] rounded" />
        </div>
      ))}
    </div>
  )
}
