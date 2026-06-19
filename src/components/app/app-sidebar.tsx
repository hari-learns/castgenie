import Link from "next/link"
import { SparklesIcon, type LucideIcon } from "lucide-react"

import { navItems } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"

export type SidebarSectionLink = {
  title: string
  description?: string
  href: string
  icon: LucideIcon
  active?: boolean
}

type AppSidebarProps = {
  sectionTitle?: string
  sectionLinks?: SidebarSectionLink[]
}

export function AppSidebar({ sectionTitle, sectionLinks = [] }: AppSidebarProps) {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-card px-3 py-5 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <SparklesIcon aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold">CastGenie</span>
          <span className="text-xs text-muted-foreground">
            English to Castform
          </span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className="h-10 justify-start px-2"
            asChild
          >
            <Link href={item.href}>
              <item.icon data-icon="inline-start" aria-hidden="true" />
              {item.title}
            </Link>
          </Button>
        ))}
      </nav>

      {sectionLinks.length ? (
        <div className="mt-6 border-t border-border pt-4">
          {sectionTitle ? (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {sectionTitle}
            </p>
          ) : null}
          <nav className="flex flex-col gap-1" aria-label={sectionTitle ?? "Project sections"}>
            {sectionLinks.map((item) => (
              <Button
                key={item.href}
                variant={item.active ? "secondary" : "ghost"}
                className="h-auto justify-start gap-2 px-2 py-2"
                asChild
              >
                <Link href={item.href}>
                  <item.icon data-icon="inline-start" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="text-sm font-medium leading-5">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="max-w-full truncate text-xs leading-4 text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="mt-auto rounded-lg border border-border bg-background p-3">
        <p className="text-sm font-medium">Demo mode</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Local JSON pipeline with mock-safe providers and optional real source discovery.
        </p>
      </div>
    </aside>
  )
}
