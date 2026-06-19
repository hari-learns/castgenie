import { stat } from "node:fs/promises"

import { nanoid } from "nanoid"

import { projectArtifactPath } from "@/lib/paths"
import {
  appendArtifactJsonl,
  readJson,
  readProject,
  readProjectArtifacts,
  readTextIfExists,
  writeArtifactJson,
} from "@/lib/storage"
import type { SourceRecord } from "@/types/artifacts"
import type {
  CastformProviderLog,
  CastformRun,
  CastformRunMode,
  CastformRunsResponse,
  ModelVersion,
  TrainingReadiness,
} from "@/types/castform"

const castformArtifactPaths = {
  workspace: "castform_project",
  config: "castform_project/config.yaml",
  chunks: "chunks.jsonl",
  trainQa: "datasets/train_qa.jsonl",
  evalQa: "datasets/eval_qa.jsonl",
  actionTasks: "datasets/action_tasks.jsonl",
  rewardSpec: "rewards/reward_spec.json",
}

function now() {
  return new Date().toISOString()
}

function parseJsonlCount(content: string) {
  return content.split("\n").filter(Boolean).length
}

async function exists(projectId: string, relativePath: string) {
  try {
    await stat(projectArtifactPath(projectId, relativePath))
    return true
  } catch {
    return false
  }
}

function emptyPermissions(): TrainingReadiness["sourcePermissions"] {
  return {
    total: 0,
    allowedPublic: 0,
    userProvided: 0,
    licensed: 0,
    unknown: 0,
    blocked: 0,
  }
}

function countSources(sources: SourceRecord[]) {
  const counts = emptyPermissions()
  counts.total = sources.length

  for (const source of sources) {
    if (source.permissionStatus === "allowed_public") counts.allowedPublic += 1
    if (source.permissionStatus === "user_provided") counts.userProvided += 1
    if (source.permissionStatus === "licensed") counts.licensed += 1
    if (source.permissionStatus === "unknown") counts.unknown += 1
    if (source.permissionStatus === "blocked") counts.blocked += 1
  }

  return counts
}

async function traceCount(projectId: string, relativePath: string) {
  return parseJsonlCount(await readTextIfExists(projectArtifactPath(projectId, relativePath)))
}

async function appendProviderLog(record: Omit<CastformProviderLog, "id" | "createdAt">) {
  await appendArtifactJsonl(record.projectId, "logs/castform_provider_logs.jsonl", [
    {
      id: `castform_log_${nanoid(10)}`,
      createdAt: now(),
      ...record,
    },
  ])
}

async function readRuns(projectId: string) {
  const content = await readTextIfExists(projectArtifactPath(projectId, "castform", "runs.jsonl"))
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CastformRun)
}

async function appendRun(run: CastformRun) {
  await appendArtifactJsonl(run.projectId, "castform/runs.jsonl", [run])
}

async function readModelVersions(projectId: string) {
  try {
    return await readJson<ModelVersion[]>(projectArtifactPath(projectId, "model_versions.json"))
  } catch {
    return []
  }
}

async function writeModelVersions(projectId: string, versions: ModelVersion[]) {
  await writeArtifactJson(projectId, "model_versions.json", versions)
}

function realConfig() {
  return {
    realRunsEnabled: process.env.CASTFORM_REAL_RUNS_ENABLED === "true",
    hasApiKey: Boolean(process.env.CASTFORM_API_KEY),
    hasBaseUrl: Boolean(process.env.CASTFORM_BASE_URL),
    pythonBin: process.env.CASTFORM_PYTHON_BIN || "python3",
  }
}

export async function computeTrainingReadiness(projectId: string): Promise<TrainingReadiness> {
  const artifacts = await readProjectArtifacts(projectId)
  const [
    sourceManifestExists,
    chunksContent,
    trainQaContent,
    evalQaContent,
    actionTasksContent,
    rewardSpecContent,
    configExists,
    chatTraceCount,
    actionTraceCount,
    feedbackTraceCount,
  ] = await Promise.all([
    exists(projectId, "source_manifest.json"),
    readTextIfExists(projectArtifactPath(projectId, "chunks.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "train_qa.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "eval_qa.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "action_tasks.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "rewards", "reward_spec.json")),
    exists(projectId, castformArtifactPaths.config),
    traceCount(projectId, "logs/chat_traces.jsonl"),
    traceCount(projectId, "logs/action_traces.jsonl"),
    traceCount(projectId, "logs/feedback.jsonl"),
  ])
  const datasetCounts = {
    chunks: parseJsonlCount(chunksContent),
    trainQa: parseJsonlCount(trainQaContent),
    evalQa: parseJsonlCount(evalQaContent),
    actionTasks: parseJsonlCount(actionTasksContent),
  }
  const artifactRows = [
    {
      path: "source_manifest.json",
      label: "Source manifest",
      required: true,
      exists: sourceManifestExists,
      count: artifacts.sources.length,
    },
    {
      path: "chunks.jsonl",
      label: "Retrieval chunks",
      required: true,
      exists: datasetCounts.chunks > 0,
      count: datasetCounts.chunks,
    },
    {
      path: "datasets/train_qa.jsonl",
      label: "Train QA dataset",
      required: true,
      exists: datasetCounts.trainQa > 0,
      count: datasetCounts.trainQa,
    },
    {
      path: "datasets/eval_qa.jsonl",
      label: "Eval QA dataset",
      required: true,
      exists: datasetCounts.evalQa > 0,
      count: datasetCounts.evalQa,
    },
    {
      path: "datasets/action_tasks.jsonl",
      label: "Action-task dataset",
      required: true,
      exists: datasetCounts.actionTasks > 0,
      count: datasetCounts.actionTasks,
    },
    {
      path: "rewards/reward_spec.json",
      label: "Reward spec",
      required: true,
      exists: Boolean(rewardSpecContent),
    },
    {
      path: castformArtifactPaths.config,
      label: "Castform workspace config",
      required: true,
      exists: configExists,
    },
  ]
  const sourcePermissions = countSources(artifacts.sources)
  const blockingIssues: string[] = []
  const warnings: string[] = []

  for (const artifact of artifactRows) {
    if (artifact.required && !artifact.exists) {
      blockingIssues.push(`Missing required artifact: ${artifact.path}`)
    }
  }

  if (sourcePermissions.unknown > 0) {
    blockingIssues.push(
      `${sourcePermissions.unknown} source(s) have unknown permission status.`
    )
  }

  if (sourcePermissions.blocked > 0) {
    blockingIssues.push(`${sourcePermissions.blocked} source(s) are blocked for training.`)
  }

  if (artifacts.uploadManifest?.sourceConfig.uploadedFileCount) {
    if (!artifacts.uploadManifest.sourceConfig.permissionAttested) {
      blockingIssues.push("Uploaded files do not have permission attestation.")
    }

    if (
      artifacts.uploadManifest.sourceConfig.parseableFileCount === 0 &&
      artifacts.uploadManifest.sourceConfig.skippedFileCount > 0
    ) {
      blockingIssues.push("Uploaded files were stored but none were parseable for training.")
    }
  }

  if (artifacts.sources.some((source) => source.provider === "seed" || source.provider === "wire_neurons")) {
    warnings.push("Prototype fixture sources should be replaced or reviewed before real training.")
  }

  if (artifacts.webDiscovery?.results.some((result) => result.permissionStatus === "unknown")) {
    warnings.push("Some discovered web sources need permission review.")
  }

  if (chatTraceCount + actionTraceCount === 0) {
    warnings.push("No chat/action traces yet. Trace training remains unavailable.")
  }

  const readiness: TrainingReadiness = {
    projectId,
    readyForMock: artifactRows.some((artifact) => artifact.exists),
    readyForReal: blockingIssues.length === 0,
    generatedAt: now(),
    artifacts: artifactRows,
    datasetCounts,
    sourcePermissions,
    rewardSpecPresent: Boolean(rewardSpecContent),
    traceCounts: {
      chat: chatTraceCount,
      action: actionTraceCount,
      feedback: feedbackTraceCount,
    },
    blockingIssues,
    warnings,
  }

  await writeArtifactJson(projectId, "castform/readiness.json", readiness)
  return readiness
}

function runArtifacts() {
  return castformArtifactPaths
}

function mockModelVersion(projectId: string, run: CastformRun): ModelVersion {
  return {
    id: `model_mock_${nanoid(10)}`,
    projectId,
    sourceRunId: run.id,
    status: "mock_ready",
    createdAt: now(),
    updatedAt: now(),
    corpusSummary: {
      sources: run.readiness.sourcePermissions.total,
      chunks: run.readiness.datasetCounts.chunks,
    },
    datasetSummary: {
      trainQa: run.readiness.datasetCounts.trainQa,
      evalQa: run.readiness.datasetCounts.evalQa,
      actionTasks: run.readiness.datasetCounts.actionTasks,
    },
  }
}

async function ensureModelVersionForRun(run: CastformRun) {
  const versions = await readModelVersions(run.projectId)

  if (versions.some((version) => version.sourceRunId === run.id)) {
    return versions
  }

  const next = [mockModelVersion(run.projectId, run), ...versions]
  await writeModelVersions(run.projectId, next)
  return next
}

async function callPythonRunner(projectId: string, operation: "launch" | "status", run?: CastformRun) {
  const config = realConfig()
  const { runCastformPython } = await import("@/server/castform/python-runner")
  const stdout = await runCastformPython({
    projectId,
    operation,
    pythonBin: config.pythonBin,
    castformRunId: run?.castformRunId,
  })

  return JSON.parse(stdout) as {
    status: "queued" | "running" | "complete" | "failed"
    castformRunId?: string
    statusUrl?: string
    modelEndpoint?: string
    error?: string
  }
}

export async function getCastformState(projectId: string): Promise<CastformRunsResponse | null> {
  const project = await readProject(projectId)

  if (!project) {
    return null
  }

  const [readiness, runs, modelVersions] = await Promise.all([
    computeTrainingReadiness(projectId),
    readRuns(projectId),
    readModelVersions(projectId),
  ])
  const sortedRuns = runs.toSorted(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return {
    readiness,
    latestRun: sortedRuns[0] ?? null,
    runs: sortedRuns,
    modelVersions,
    config: realConfig(),
  }
}

export async function createCastformRun(projectId: string, mode: CastformRunMode) {
  const project = await readProject(projectId)

  if (!project) {
    return null
  }

  const readiness = await computeTrainingReadiness(projectId)
  const config = realConfig()
  const createdAt = now()
  const run: CastformRun = {
    id: `castform_run_${nanoid(10)}`,
    projectId,
    mode,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    readiness,
    artifactPaths: runArtifacts(),
    progress: 10,
    refreshCount: 0,
  }

  if (mode === "real") {
    const blockers = [
      ...readiness.blockingIssues,
      ...(!config.realRunsEnabled ? ["CASTFORM_REAL_RUNS_ENABLED is not true."] : []),
      ...(!config.hasApiKey ? ["CASTFORM_API_KEY is not configured."] : []),
      ...(!config.hasBaseUrl ? ["CASTFORM_BASE_URL is not configured."] : []),
    ]

    if (blockers.length > 0) {
      const blockedRun = {
        ...run,
        status: "blocked" as const,
        progress: 0,
        error: blockers.join(" "),
      }
      await appendRun(blockedRun)
      await appendProviderLog({
        projectId,
        runId: blockedRun.id,
        mode,
        operation: "create_run",
        status: "blocked",
        message: blockedRun.error,
      })
      return blockedRun
    }

    try {
      const result = await callPythonRunner(projectId, "launch")
      const realRun: CastformRun = {
        ...run,
        status: result.status,
        progress: result.status === "complete" ? 100 : 30,
        castformRunId: result.castformRunId,
        statusUrl: result.statusUrl,
        modelEndpoint: result.modelEndpoint,
        error: result.error,
      }
      await appendRun(realRun)
      await appendProviderLog({
        projectId,
        runId: realRun.id,
        mode,
        operation: "create_run",
        status: result.status === "failed" ? "failed" : "success",
        message: result.error ?? `Real Castform run created with status ${result.status}.`,
      })
      return realRun
    } catch (error) {
      const failedRun: CastformRun = {
        ...run,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown Castform launch error.",
      }
      await appendRun(failedRun)
      await appendProviderLog({
        projectId,
        runId: failedRun.id,
        mode,
        operation: "create_run",
        status: "failed",
        message: failedRun.error ?? "Unknown Castform launch error.",
      })
      return failedRun
    }
  }

  await appendRun(run)
  await appendProviderLog({
    projectId,
    runId: run.id,
    mode,
    operation: "create_run",
    status: "success",
    message: "Mock Castform run queued.",
  })
  return run
}

export async function refreshCastformRun(projectId: string, runId: string) {
  const runs = await readRuns(projectId)
  const current = runs.findLast((run) => run.id === runId)

  if (!current) {
    return null
  }

  const readiness = await computeTrainingReadiness(projectId)
  const refreshedAt = now()

  if (current.mode === "mock") {
    const nextRefreshCount = current.refreshCount + 1
    const status =
      current.status === "complete"
        ? "complete"
        : nextRefreshCount >= 2
          ? "complete"
          : "running"
    const nextRun: CastformRun = {
      ...current,
      status,
      updatedAt: refreshedAt,
      readiness,
      progress: status === "complete" ? 100 : 55,
      refreshCount: nextRefreshCount,
    }
    await appendRun(nextRun)
    if (status === "complete") {
      await ensureModelVersionForRun(nextRun)
    }
    await appendProviderLog({
      projectId,
      runId,
      mode: "mock",
      operation: "refresh_run",
      status: "success",
      message: `Mock Castform run refreshed to ${status}.`,
    })
    return nextRun
  }

  try {
    const result = await callPythonRunner(projectId, "status", current)
    const nextRun: CastformRun = {
      ...current,
      status: result.status,
      updatedAt: refreshedAt,
      readiness,
      progress: result.status === "complete" ? 100 : 55,
      refreshCount: current.refreshCount + 1,
      castformRunId: result.castformRunId ?? current.castformRunId,
      statusUrl: result.statusUrl ?? current.statusUrl,
      modelEndpoint: result.modelEndpoint ?? current.modelEndpoint,
      error: result.error,
    }
    await appendRun(nextRun)
    if (nextRun.status === "complete" && nextRun.modelEndpoint) {
      const versions = await readModelVersions(projectId)
      if (!versions.some((version) => version.sourceRunId === nextRun.id)) {
        await writeModelVersions(projectId, [
          {
            ...mockModelVersion(projectId, nextRun),
            id: `model_real_${nanoid(10)}`,
            status: "hosted",
            castformRunId: nextRun.castformRunId,
            statusUrl: nextRun.statusUrl,
            modelEndpoint: nextRun.modelEndpoint,
          },
          ...versions,
        ])
      }
    }
    await appendProviderLog({
      projectId,
      runId,
      mode: "real",
      operation: "refresh_run",
      status: result.status === "failed" ? "failed" : "success",
      message: result.error ?? `Real Castform run refreshed to ${result.status}.`,
    })
    return nextRun
  } catch (error) {
    const failedRun: CastformRun = {
      ...current,
      status: "failed",
      updatedAt: refreshedAt,
      readiness,
      progress: current.progress,
      refreshCount: current.refreshCount + 1,
      error: error instanceof Error ? error.message : "Unknown Castform status error.",
    }
    await appendRun(failedRun)
    await appendProviderLog({
      projectId,
      runId,
      mode: "real",
      operation: "refresh_run",
      status: "failed",
      message: failedRun.error ?? "Unknown Castform status error.",
    })
    return failedRun
  }
}
