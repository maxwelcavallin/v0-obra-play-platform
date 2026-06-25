import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6">
        <Image src="/logo.svg" alt="Obra Play" width={140} height={24} className="mx-auto opacity-80" />
      </div>

      <div className="mb-4">
        <span className="text-[120px] font-black text-[#E3EEFF] leading-none select-none">404</span>
      </div>

      <h1 className="text-xl font-bold text-[#212121] mb-2">Página não encontrada</h1>
      <p className="text-sm text-[#9E9E9E] max-w-[280px] leading-relaxed mb-8">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1565C0] text-white text-sm font-semibold shadow hover:bg-[#1255A8] transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
