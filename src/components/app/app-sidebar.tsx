import Link from "next/link"
import { SparklesIcon } from "lucide-react"

import { navItems } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"

export function AppSidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-card px-4 py-5 lg:flex lg:flex-col">
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
            className="justify-start"
            asChild
          >
            <Link href={item.href}>
              <item.icon data-icon="inline-start" aria-hidden="true" />
              {item.title}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-background p-4">
        <p className="text-sm font-medium">Demo mode</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Static shell only. Real storage and build pipeline start in Wave 2.
        </p>
      </div>
    </aside>
  )
}
