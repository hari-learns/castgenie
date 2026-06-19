import type { ReactNode } from "react"

import {
  AppSidebar,
  type SidebarSectionLink,
} from "@/components/app/app-sidebar"
import { MobileNav } from "@/components/app/mobile-nav"

type PageShellProps = {
  children: ReactNode
  sidebarSectionTitle?: string
  sidebarSectionLinks?: SidebarSectionLink[]
}

export function PageShell({
  children,
  sidebarSectionTitle,
  sidebarSectionLinks,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileNav />
      <div className="flex min-w-0">
        <AppSidebar
          sectionTitle={sidebarSectionTitle}
          sectionLinks={sidebarSectionLinks}
        />
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
