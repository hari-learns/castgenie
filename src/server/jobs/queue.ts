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
  isSupabaseStorageEnabled,
  readLatestSupabaseBuildJob,
  updateSupabaseBuildJob,
} from "@/server/supabase/repository"
import { updateProjectRecord } from "@/server/storage/repository"
import type { BuildJob } from "@/types/jobs"

export type ClaimedBuildJob = BuildJob & {
  kind: "build_project"
  attempts: number
  maxAttempts: number
  payload: Record<string, unknown>
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
  const timestamp = now()
  return {
    id: `job_${nanoid(10)}`,
    projectId,
    kind: "build_project",
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

export async function readLatestBuildProjectJob(projectId: string) {
  return (await readLatestSupabaseBuildJob(projectId)) ?? readBuildJob(projectId)
}

export async function updateBuildProjectJob(job: BuildJob) {
  await writeBuildJob(job)
  await updateSupabaseBuildJob(job.id, job)
}

async function claimLocalQueuedJob(): Promise<ClaimedBuildJob | null> {
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const projectId = entry.name
    const project = await readProject(projectId)
    const job = await readBuildJob(projectId)

    if (!project || !job || job.status !== "queued") {
      continue
    }

    const claimed: ClaimedBuildJob = {
      ...job,
      kind: "build_project",
      status: "running",
      attempts: 1,
      maxAttempts: 3,
      payload: {},
      updatedAt: now(),
    }
    await writeBuildJob(claimed)
    return claimed
  }

  return null
}

export async function claimNextBuildProjectJob(workerId = defaultWorkerId()) {
  return (await claimSupabaseQueuedJob(workerId)) ?? claimLocalQueuedJob()
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

export async function readStoredBuildJob(projectId: string) {
  return readJson<BuildJob>(projectArtifactPath(projectId, "jobs", "latest.json"))
}

export { isSupabaseStorageEnabled }
