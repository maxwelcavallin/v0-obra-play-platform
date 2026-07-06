import { requirePlatformAdmin } from "./middleware-check"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export const metadata = {
  title: "ObraPlay Admin",
  description: "Painel administrativo interno",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin()

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <AdminSidebar adminName={session.name} adminEmail={session.email} />
      <main className="flex-1 ml-[240px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
