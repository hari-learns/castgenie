"use client"

import Link from "next/link"
import {
  BotIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderArchiveIcon,
  GraduationCapIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlayIcon,
  ScrollTextIcon,
  SparklesIcon,
} from "lucide-react"
import { useState } from "react"

import { navItems } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"

export type SidebarIconKey =
  | "bot"
  | "database"
  | "file-text"
  | "folder-archive"
  | "graduation-cap"
  | "play"
  | "scroll-text"

export type SidebarSectionLink = {
  title: string
  description?: string
  href: string
  icon: SidebarIconKey
  active?: boolean
}

type AppSidebarProps = {
  sectionTitle?: string
  sectionLinks?: SidebarSectionLink[]
}

const sectionIcons = {
  bot: BotIcon,
  database: DatabaseIcon,
  "file-text": FileTextIcon,
  "folder-archive": FolderArchiveIcon,
  "graduation-cap": GraduationCapIcon,
  play: PlayIcon,
  "scroll-text": ScrollTextIcon,
} satisfies Record<SidebarIconKey, typeof BotIcon>

export function AppSidebar({ sectionTitle, sectionLinks = [] }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={
        collapsed
          ? "hidden min-h-screen w-16 shrink-0 border-r border-border bg-card px-2 py-5 lg:flex lg:flex-col"
          : "hidden min-h-screen w-64 shrink-0 border-r border-border bg-card px-3 py-5 lg:flex lg:flex-col"
      }
    >
      <div
        className={
          collapsed
            ? "flex flex-col items-center gap-3"
            : "flex items-center justify-between gap-2"
        }
      >
        <Link
          href="/"
          className={
            collapsed
              ? "flex items-center justify-center"
              : "flex min-w-0 items-center gap-3 px-2"
          }
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <SparklesIcon aria-hidden="true" />
          </span>
          {!collapsed ? (
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">CastGenie</span>
              <span className="text-xs text-muted-foreground">
                English to Castform
              </span>
            </span>
          ) : null}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={collapsed ? "size-9 shrink-0" : "size-8 shrink-0"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpenIcon aria-hidden="true" />
          ) : (
            <PanelLeftCloseIcon aria-hidden="true" />
          )}
          <span className="sr-only">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </Button>
      </div>

      <nav
        className={
          collapsed
            ? "mt-8 flex flex-col items-center gap-2"
            : "mt-8 flex flex-col gap-1"
        }
        aria-label="Primary"
      >
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            className={collapsed ? "size-10" : "h-10 justify-start px-2"}
            asChild
          >
            <Link href={item.href} title={collapsed ? item.title : undefined}>
              <item.icon data-icon="inline-start" aria-hidden="true" />
              {!collapsed ? item.title : null}
            </Link>
          </Button>
        ))}
      </nav>

      {sectionLinks.length ? (
        <div
          className={
            collapsed
              ? "mt-6 flex flex-col items-center border-t border-border pt-4"
              : "mt-6 border-t border-border pt-4"
          }
        >
          {sectionTitle && !collapsed ? (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {sectionTitle}
            </p>
          ) : null}
          <nav
            className={
              collapsed
                ? "flex flex-col items-center gap-2"
                : "flex flex-col gap-1"
            }
            aria-label={sectionTitle ?? "Project sections"}
          >
            {sectionLinks.map((item) => {
              const SectionIcon = sectionIcons[item.icon]

              return (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  size={collapsed ? "icon" : "default"}
                  className={
                    collapsed
                      ? "size-10"
                      : "h-auto justify-start gap-2 px-2 py-2"
                  }
                  asChild
                >
                  <Link href={item.href} title={collapsed ? item.title : undefined}>
                    <SectionIcon data-icon="inline-start" aria-hidden="true" />
                    {!collapsed ? (
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
                    ) : null}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>
      ) : null}

      {!collapsed ? (
        <div className="mt-auto rounded-lg border border-border bg-background p-3">
        <p className="text-sm font-medium">Demo mode</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Local JSON pipeline with mock-safe providers and optional real source discovery.
        </p>
        </div>
      ) : null}
    </aside>
  )
}
