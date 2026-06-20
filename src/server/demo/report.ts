import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { storageRoot } from "@/lib/paths"
import { readJson, readProject, readProjectArtifacts, readTextIfExists } from "@/lib/storage"
import { getCastformState, getHostedModelVersion } from "@/server/castform/runs"
import type { CastformValidationReport } from "@/types/castform"
import type { ActionTrace, ChatTrace } from "@/types/traces"

export type DemoReport = {
  id: string
  generatedAt: string
  mode: "local" | "real" | "verify_hosted"
  projectId: string
  projectName?: string
  projectStatus?: string
  source: {
    provider?: string
    selectedUrls: string[]
    permissionStatuses: Record<string, number>
  }
  corpus: {
    sources: number
    documents: number
    chunks: number
    trainQa: number
    evalQa: number
  }
  castform: {
    readyForReal: boolean
    firstBlocker?: string
    latestRunStatus?: string
    castformRunId?: string
    statusUrl?: string
    hostedModelId?: string
    validationStatus?: string
  }
  providers: {
    latestChatProvider?: string
    latestActionProvider?: string
  }
  reportPath: string
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function parseJsonl<T>(content: string) {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

async function latestTraceProvider<T extends { provider: string }>(projectId: string, relativePath: string) {
  const content = await readTextIfExists(path.join(storageRoot, "projects", projectId, relativePath))
  const rows = parseJsonl<T>(content)
  return rows.at(-1)?.provider
}

export async function writeDemoReport(input: {
  projectId: string
  mode: DemoReport["mode"]
}) {
  const [project, artifacts, castformState, hostedModel] = await Promise.all([
    readProject(input.projectId),
    readProjectArtifacts(input.projectId),
    getCastformState(input.projectId),
    getHostedModelVersion(input.projectId),
  ])
  const validation = await readJson<CastformValidationReport>(
    path.join(storageRoot, "projects", input.projectId, "castform", "validation_report.json")
  ).catch(() => null)
  const generatedAt = new Date().toISOString()
  const id = `demo_${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}_${input.projectId}`
  const reportDir = path.join(storageRoot, "demo-runs", id)
  const reportPath = path.join(reportDir, "report.json")
  const report: DemoReport = {
    id,
    generatedAt,
    mode: input.mode,
    projectId: input.projectId,
    projectName: project?.name,
    projectStatus: project?.status,
    source: {
      provider: artifacts.webDiscovery?.provider ?? artifacts.importSummary?.adapterId,
      selectedUrls:
        artifacts.webDiscovery?.results
          .filter((result) => result.selected)
          .map((result) => result.url) ?? artifacts.sources.map((source) => source.url),
      permissionStatuses: countBy(artifacts.sources.map((source) => source.permissionStatus)),
    },
    corpus: {
      sources: artifacts.sources.length,
      documents: artifacts.sourceManifestPreview ? artifacts.sources.length : 0,
      chunks: artifacts.chunks.length,
      trainQa: artifacts.trainQa.length,
      evalQa: artifacts.evalQa.length,
    },
    castform: {
      readyForReal: Boolean(castformState?.readiness.readyForReal),
      firstBlocker: castformState?.readiness.blockingIssues[0],
      latestRunStatus: castformState?.latestRun?.status,
      castformRunId: castformState?.latestRun?.castformRunId,
      statusUrl: castformState?.latestRun?.statusUrl,
      hostedModelId: hostedModel?.modelName,
      validationStatus: validation?.status,
    },
    providers: {
      latestChatProvider: await latestTraceProvider<ChatTrace>(input.projectId, "logs/chat_traces.jsonl"),
      latestActionProvider: await latestTraceProvider<ActionTrace>(input.projectId, "logs/action_traces.jsonl"),
    },
    reportPath,
  }

  await mkdir(reportDir, { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  await writeFile(path.join(storageRoot, "demo-runs", "latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8")
  return report
}
