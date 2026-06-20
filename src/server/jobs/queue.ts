import { readdir } from "node:fs/promises"
import os from "node:os"

import { nanoid } from "nanoid"

import {
  projectArtifactPath,
  projectsRoot,
} from "@/lib/paths"
import {
  readBuildJob,
  readJson,
  readProject,
  writeBuildJob,
} from "@/lib/storage"
import {
  claimSupabaseQueuedJob,
  enqueueSupabaseBuildJob,
  enqueueSupabaseJob,
  isSupabaseStorageEnabled,
  readLatestSupabaseBuildJob,
  updateSupabaseBuildJob,
} from "@/server/supabase/repository"
import { updateProjectRecord } from "@/server/storage/repository"
import type { BuildJob, JobKind } from "@/types/jobs"

export type ClaimedJob = BuildJob & {
  kind: JobKind
  attempts: number
  maxAttempts: number
  payload: Record<string, unknown>
}

export type ClaimedBuildJob = ClaimedJob & {
  kind: "build_project"
}

function now() {
  return new Date().toISOString()
}

export function defaultWorkerId() {
  return `worker_${os.hostname()}_${process.pid}`
}

export function createQueuedBuildJobRecord(
  projectId: string,
  payload: Record<string, unknown> = {}
): ClaimedBuildJob {
  return createQueuedJobRecord(projectId, "build_project", payload) as ClaimedBuildJob
}

export function createQueuedJobRecord(
  projectId: string,
  kind: JobKind,
  payload: Record<string, unknown> = {}
): ClaimedJob {
  const timestamp = now()
  return {
    id: `job_${nanoid(10)}`,
    projectId,
    kind,
    status: "queued",
    currentStep: "queued",
    progress: 0,
    attempts: 0,
    maxAttempts: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    payload,
  }
}

export async function enqueueBuildProjectJob(
  projectId: string,
  payload: Record<string, unknown> = {}
) {
  const supabaseJob = await enqueueSupabaseBuildJob(projectId, payload)
  const job = supabaseJob ?? createQueuedBuildJobRecord(projectId, payload)

  await writeBuildJob(job)
  await updateProjectRecord(projectId, { status: "queued" })
  return job
}

export async function enqueueCastformTrainJob(
  projectId: string,
  payload: { runId: string } & Record<string, unknown>
) {
  const supabaseJob = await enqueueSupabaseJob(projectId, "castform_train", payload)
  const job = supabaseJob ?? createQueuedJobRecord(projectId, "castform_train", payload)

  await writeBuildJobToPath(projectId, "castform/jobs/latest_train_job.json", job)
  return job
}

export async function readLatestBuildProjectJob(projectId: string) {
  return (await readLatestSupabaseBuildJob(projectId)) ?? readBuildJob(projectId)
}

export async function updateBuildProjectJob(job: BuildJob) {
  await writeBuildJob(job)
  await updateSupabaseBuildJob(job.id, job)
}

export async function updateAnyJob(job: BuildJob & { kind?: JobKind }) {
  if (job.kind === "castform_train") {
    await writeBuildJobToPath(job.projectId, "castform/jobs/latest_train_job.json", job)
    await updateSupabaseBuildJob(job.id, job)
    return
  }

  await updateBuildProjectJob(job)
}

async function writeBuildJobToPath(projectId: string, relativePath: string, job: BuildJob) {
  const { writeArtifactJson } = await import("@/lib/storage")
  await writeArtifactJson(projectId, relativePath, job)
}

async function claimLocalQueuedJob(): Promise<ClaimedJob | null> {
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const projectId = entry.name
    const project = await readProject(projectId)
    const trainJob = await readJson<ClaimedJob>(
      projectArtifactPath(projectId, "castform", "jobs", "latest_train_job.json")
    ).catch(() => null)
    const job = trainJob?.status === "queued" ? trainJob : await readBuildJob(projectId)

    if (!project || !job || job.status !== "queued") {
      continue
    }

    const claimed: ClaimedJob = {
      ...job,
      kind: job.kind ?? "build_project",
      status: "running",
      attempts: 1,
      maxAttempts: 3,
      payload: {},
      updatedAt: now(),
    }
    await updateAnyJob(claimed)
    return claimed
  }

  return null
}

export async function claimNextJob(workerId = defaultWorkerId()) {
  return (await claimSupabaseQueuedJob(workerId)) ?? claimLocalQueuedJob()
}

export async function claimNextBuildProjectJob(workerId = defaultWorkerId()) {
  const job = await claimNextJob(workerId)
  return job?.kind === "build_project" ? job : null
}

export async function markBuildProjectJobFailed(job: BuildJob, error: string) {
  const failed: BuildJob = {
    ...job,
    status: "failed",
    error,
    progress: job.progress,
    updatedAt: now(),
  }
  await updateBuildProjectJob(failed)
  await updateProjectRecord(job.projectId, { status: "failed" })
  return failed
}

export async function markAnyJobFailed(job: BuildJob & { kind?: JobKind }, error: string) {
  const failed: BuildJob & { kind?: JobKind } = {
    ...job,
    status: "failed",
    error,
    progress: job.progress,
    updatedAt: now(),
  }
  await updateAnyJob(failed)
  if (job.kind !== "castform_train") {
    await updateProjectRecord(job.projectId, { status: "failed" })
  }
  return failed
}

export async function readStoredBuildJob(projectId: string) {
  return readJson<BuildJob>(projectArtifactPath(projectId, "jobs", "latest.json"))
}

export { isSupabaseStorageEnabled }
