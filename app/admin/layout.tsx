import { requirePlatformAdmin } from "./middleware-check"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"

export const metadata = {
  title: "ObraPlay Admin",
  description: "Painel administrativo interno ObraPlay",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin()

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar adminName={session.name} adminEmail={session.email} />
      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
        <AdminHeader adminName={session.name} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
