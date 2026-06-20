import { nanoid } from "nanoid"

import { getSupabaseAdminClient, isSupabaseStorageEnabled } from "@/server/supabase/client"
import type { CastformRun, ModelVersion } from "@/types/castform"
import type { BuildJob, JobKind, JobStatus } from "@/types/jobs"
import type { Project } from "@/types/project"

export { isSupabaseStorageEnabled }

export type SupabaseJob = BuildJob & {
  kind: JobKind
  attempts: number
  maxAttempts: number
  payload: Record<string, unknown>
}

export type SupabaseBuildJob = SupabaseJob & {
  kind: "build_project"
}

export type TrainingEventInput = {
  projectId: string
  jobId?: string
  runId?: string
  level?: "info" | "warn" | "error"
  eventType: string
  message: string
  payload?: Record<string, unknown>
}

type ProjectRow = {
  id: string
  name: string
  prompt: string
  status: Project["status"]
  domain_spec: Project["domainSpec"] | null
  source_config: Project["sourceConfig"] | null
  metrics: Project["metrics"]
  artifact_root: string
  steps: Project["steps"]
  generated_files: string[]
  payload: Project
  created_at: string
  updated_at: string
}

type JobRow = {
  id: string
  project_id: string
  kind: JobKind
  status: JobStatus
  current_step: string | null
  progress: number
  attempts: number
  max_attempts: number
  error: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

function requireClient() {
  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error(
      "Supabase storage is enabled but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
    )
  }

  return client
}

function supabaseErrorMessage(action: string, message: string) {
  if (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table") ||
    message.includes("Could not find the function")
  ) {
    return `${action}: Supabase schema is missing Wave 15 objects. Apply supabase/migrations/202606190001_wave15_core.sql in the Supabase SQL editor or CLI, then retry. Original error: ${message}`
  }

  return `${action}: ${message}`
}

function toProjectRow(project: Project): ProjectRow {
  return {
    id: project.id,
    name: project.name,
    prompt: project.prompt,
    status: project.status,
    domain_spec: project.domainSpec ?? null,
    source_config: project.sourceConfig ?? null,
    metrics: project.metrics,
    artifact_root: project.artifactRoot,
    steps: project.steps,
    generated_files: project.generatedFiles ?? [],
    payload: project,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }
}

export function projectFromSupabaseRow(row: ProjectRow): Project {
  return {
    ...row.payload,
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    domainSpec: row.domain_spec ?? undefined,
    sourceConfig: row.source_config ?? undefined,
    metrics: row.metrics,
    artifactRoot: row.artifact_root,
    steps: row.steps,
    generatedFiles: row.generated_files,
  }
}

function jobFromSupabaseRow(row: JobRow): SupabaseJob {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    currentStep: row.current_step ?? undefined,
    progress: row.progress,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    error: row.error ?? undefined,
    payload: row.payload,
  }
}

export async function upsertSupabaseProject(project: Project) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const { error } = await requireClient()
    .from("castgenie_projects")
    .upsert(toProjectRow(project))

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to upsert Supabase project", error.message))
  }
}

export async function readSupabaseProject(projectId: string) {
  if (!isSupabaseStorageEnabled()) {
    return null
  }

  const { data, error } = await requireClient()
    .from("castgenie_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle()

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to read Supabase project", error.message))
  }

  return data ? projectFromSupabaseRow(data as ProjectRow) : null
}

export async function listSupabaseProjects() {
  if (!isSupabaseStorageEnabled()) {
    return null
  }

  const { data, error } = await requireClient()
    .from("castgenie_projects")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to list Supabase projects", error.message))
  }

  return (data as ProjectRow[]).map(projectFromSupabaseRow)
}

export async function enqueueSupabaseJob(
  projectId: string,
  kind: JobKind,
  payload: Record<string, unknown> = {}
) {
  if (!isSupabaseStorageEnabled()) {
    return null
  }

  const now = new Date().toISOString()
  const job: SupabaseJob = {
    id: `job_${nanoid(10)}`,
    projectId,
    kind,
    status: "queued",
    currentStep: "queued",
    progress: 0,
    attempts: 0,
    maxAttempts: 3,
    createdAt: now,
    updatedAt: now,
    payload,
  }
  const { error } = await requireClient().from("castgenie_jobs").insert({
    id: job.id,
    project_id: projectId,
    kind: job.kind,
    status: job.status,
    current_step: job.currentStep,
    progress: job.progress,
    attempts: job.attempts,
    max_attempts: job.maxAttempts,
    payload: job.payload,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to enqueue Supabase job", error.message))
  }

  return job
}

export async function enqueueSupabaseBuildJob(projectId: string, payload: Record<string, unknown> = {}) {
  const job = await enqueueSupabaseJob(projectId, "build_project", payload)
  return job as SupabaseBuildJob | null
}

export async function readLatestSupabaseBuildJob(projectId: string) {
  if (!isSupabaseStorageEnabled()) {
    return null
  }

  const { data, error } = await requireClient()
    .from("castgenie_jobs")
    .select("*")
    .eq("project_id", projectId)
    .eq("kind", "build_project")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to read Supabase job", error.message))
  }

  return data ? jobFromSupabaseRow(data as JobRow) : null
}

export async function claimSupabaseQueuedJob(workerId: string) {
  if (!isSupabaseStorageEnabled()) {
    return null
  }

  const { data, error } = await requireClient().rpc("castgenie_claim_queued_job", {
    worker_id: workerId,
  })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to claim Supabase job", error.message))
  }

  const row = Array.isArray(data) ? data[0] : data
  return row ? jobFromSupabaseRow(row as JobRow) : null
}

export async function updateSupabaseBuildJob(
  jobId: string,
  patch: Partial<BuildJob> & { attempts?: number; payload?: Record<string, unknown> }
) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const update: Record<string, unknown> = {
    updated_at: patch.updatedAt ?? new Date().toISOString(),
  }

  if (patch.status) update.status = patch.status
  if (patch.currentStep !== undefined) update.current_step = patch.currentStep
  if (patch.progress !== undefined) update.progress = patch.progress
  if (patch.error !== undefined) update.error = patch.error
  if (patch.attempts !== undefined) update.attempts = patch.attempts
  if (patch.payload !== undefined) update.payload = patch.payload

  const { error } = await requireClient()
    .from("castgenie_jobs")
    .update(update)
    .eq("id", jobId)

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to update Supabase job", error.message))
  }
}

export async function upsertSupabaseArtifactManifest(project: Project) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const { error } = await requireClient()
    .from("castgenie_artifact_manifests")
    .upsert({
      project_id: project.id,
      files: project.generatedFiles ?? [],
      source_summary: {
        sources: project.metrics.sources,
        documents: project.metrics.documents,
        chunks: project.metrics.chunks,
      },
      training_summary: {
        trainQa: project.metrics.trainQa,
        evalQa: project.metrics.evalQa,
        practiceQuestions: project.metrics.practiceQuestions,
      },
      updated_at: project.updatedAt,
    })

  if (error) {
    throw new Error(
      supabaseErrorMessage("Unable to upsert Supabase artifact manifest", error.message)
    )
  }
}

export async function upsertSupabaseSourcesSummary(project: Project) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const { error } = await requireClient()
    .from("castgenie_sources_summary")
    .upsert({
      project_id: project.id,
      summary: {
        metrics: project.metrics,
        sourceConfig: project.sourceConfig ?? null,
      },
      updated_at: project.updatedAt,
    })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to upsert Supabase source summary", error.message))
  }
}

export async function appendSupabaseTrainingEvent(input: TrainingEventInput) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const { error } = await requireClient().from("castgenie_training_events").insert({
    id: `event_${nanoid(10)}`,
    project_id: input.projectId,
    job_id: input.jobId,
    run_id: input.runId,
    level: input.level ?? "info",
    event_type: input.eventType,
    message: input.message,
    payload: input.payload ?? {},
  })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to append Supabase training event", error.message))
  }
}

export async function upsertSupabaseCastformRun(run: CastformRun) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const { error } = await requireClient().from("castgenie_castform_runs").upsert({
    id: run.id,
    project_id: run.projectId,
    mode: run.mode,
    status: run.status,
    progress: run.progress,
    castform_run_id: run.castformRunId,
    status_url: run.statusUrl,
    model_endpoint: run.modelEndpoint,
    readiness: run.readiness,
    artifact_paths: run.artifactPaths,
    error: run.error,
    payload: run,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
  })

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to upsert Supabase Castform run", error.message))
  }
}

export async function replaceSupabaseModelVersions(projectId: string, versions: ModelVersion[]) {
  if (!isSupabaseStorageEnabled()) {
    return
  }

  const client = requireClient()
  const { error: deleteError } = await client
    .from("castgenie_model_versions")
    .delete()
    .eq("project_id", projectId)

  if (deleteError) {
    throw new Error(
      supabaseErrorMessage("Unable to replace Supabase model versions", deleteError.message)
    )
  }

  if (versions.length === 0) {
    return
  }

  const { error } = await client.from("castgenie_model_versions").insert(
    versions.map((version) => ({
      id: version.id,
      project_id: version.projectId,
      source_run_id: version.sourceRunId,
      status: version.status,
      corpus_summary: version.corpusSummary,
      dataset_summary: version.datasetSummary,
      castform_run_id: version.castformRunId,
      status_url: version.statusUrl,
      model_endpoint: version.modelEndpoint,
      model_name: version.modelName,
      payload: version,
      created_at: version.createdAt,
      updated_at: version.updatedAt,
    }))
  )

  if (error) {
    throw new Error(supabaseErrorMessage("Unable to insert Supabase model versions", error.message))
  }
}
