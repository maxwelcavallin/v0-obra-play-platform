"use client"

import { useState } from "react"
import { AppBar } from "@/components/dashboard/app-bar"
import { Sidebar } from "@/components/dashboard/sidebar"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <AppBar onMenuOpen={() => setDrawerOpen(true)} />
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="pt-14 md:pl-[260px] min-h-screen">
        {children}
      </main>
      <OnboardingTour />
    </div>
  )
}
