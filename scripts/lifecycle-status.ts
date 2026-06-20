import { readFileSync } from "node:fs"
import { readdir } from "node:fs/promises"

import { loadEnvConfig } from "@next/env"

import { projectsRoot } from "@/lib/paths"
import { getCastformState } from "@/server/castform/runs"
import { hasSupabaseConfig, isSupabaseStorageEnabled } from "@/server/supabase/client"
import {
  listSupabaseJobsSummary,
  listSupabaseProjects,
} from "@/server/supabase/repository"

async function localProjectIds() {
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
}

async function main() {
  loadEnvConfig(process.cwd())
  const text = readFileSync(".env.local", "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const index = trimmed.indexOf("=")
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1)
  }

  const localIds = await localProjectIds()
  const status: Record<string, unknown> = {
    storageMode: process.env.CASTGENIE_STORAGE_MODE ?? "local",
    supabaseEnabled: isSupabaseStorageEnabled(),
    supabaseConfigPresent: hasSupabaseConfig(),
    localProjectCount: localIds.length,
  }

  try {
    const [projects, jobSummary] = await Promise.all([
      listSupabaseProjects(),
      listSupabaseJobsSummary(),
    ])

    status.supabaseReachable = true
    status.supabaseProjectCount = projects?.length ?? null
    status.supabaseJobSummary = jobSummary
    status.recentProjects = projects?.slice(0, 5).map((project) => ({
      id: project.id,
      status: project.status,
      updatedAt: project.updatedAt,
      sources: project.metrics.sources,
      chunks: project.metrics.chunks,
    })) ?? []
  } catch (error) {
    status.supabaseReachable = false
    status.supabaseError = error instanceof Error ? error.message : "Unknown Supabase status error"
  }

  const projectId = process.argv[2] ?? localIds.at(-1)
  if (projectId) {
    const castform = await getCastformState(projectId).catch((error) => {
      status.castformStateError = error instanceof Error ? error.message : "Unknown Castform status error"
      return null
    })

    status.project = {
      id: projectId,
      latestRun: castform?.latestRun
        ? {
            id: castform.latestRun.id,
            mode: castform.latestRun.mode,
            status: castform.latestRun.status,
            castformRunId: castform.latestRun.castformRunId,
            statusUrl: castform.latestRun.statusUrl,
            error: castform.latestRun.error,
          }
        : null,
      hostedModelCount:
        castform?.modelVersions.filter((version) => version.status === "hosted").length ?? 0,
      readyForReal: castform?.readiness.readyForReal ?? null,
      firstBlocker: castform?.readiness.blockingIssues[0] ?? null,
    }
  }

  console.log(JSON.stringify(status, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown lifecycle status failure")
  process.exitCode = 1
})
