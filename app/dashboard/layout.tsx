import { AppBar } from "@/components/dashboard/app-bar"
import { Sidebar, BottomNav } from "@/components/dashboard/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <AppBar />
      <Sidebar />
      <main className="pt-14 md:pl-[260px] pb-16 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
