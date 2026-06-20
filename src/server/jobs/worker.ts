import {
  executeCastformTrainingJob,
  maybeAutoLaunchCastformRun,
} from "@/server/castform/runs"
import {
  claimNextJob,
  defaultWorkerId,
  markAnyJobFailed,
  updateAnyJob,
  updateBuildProjectJob,
} from "@/server/jobs/queue"
import { runBuildJob } from "@/server/jobs/runner"
import { appendSupabaseTrainingEvent } from "@/server/supabase/repository"
import { mirrorProjectRecord } from "@/server/storage/repository"

type WorkerOptions = {
  workerId?: string
}

type WorkerResult =
  | {
      status: "idle"
    }
  | {
      status: "processed"
      projectId: string
      jobId: string
      castformRunId?: string
      kind: string
    }
  | {
      status: "failed"
      projectId: string
      jobId: string
      error: string
    }

export async function processOneBuildJob(options: WorkerOptions = {}): Promise<WorkerResult> {
  const workerId = options.workerId ?? defaultWorkerId()
  const job = await claimNextJob(workerId)

  if (!job) {
    return { status: "idle" }
  }

  await appendSupabaseTrainingEvent({
    projectId: job.projectId,
    jobId: job.id,
    eventType: "job_claimed",
    message: `${job.kind} job ${job.id} claimed by ${workerId}.`,
    payload: { workerId, kind: job.kind },
  })

  try {
    if (job.kind === "castform_train") {
      const castformJob = {
        ...job,
        kind: "castform_train" as const,
      }
      const runId = typeof job.payload.runId === "string" ? job.payload.runId : ""
      if (!runId) {
        throw new Error("Castform train job payload is missing runId.")
      }

      const run = await executeCastformTrainingJob(job.projectId, runId, castformJob)
      await updateAnyJob({
        ...castformJob,
        status: run.status === "failed" || run.status === "blocked" ? "failed" : "complete",
        currentStep: run.status === "failed" || run.status === "blocked"
          ? "castform_training_failed"
          : "castform_training_launched",
        progress: run.status === "failed" || run.status === "blocked" ? run.progress : 100,
        error: run.error,
        updatedAt: new Date().toISOString(),
      })
      await appendSupabaseTrainingEvent({
        projectId: job.projectId,
        jobId: castformJob.id,
        runId,
        level: run.status === "failed" || run.status === "blocked" ? "error" : "info",
        eventType: "castform_train_job_completed",
        message: `Castform train job ${job.id} completed with run status ${run.status}.`,
        payload: {
          castformRunId: run.castformRunId,
          statusUrl: run.statusUrl,
          modelName: run.modelName,
        },
      })

      return {
        status: "processed",
        projectId: job.projectId,
        jobId: job.id,
        castformRunId: run.castformRunId ?? run.id,
        kind: job.kind,
      }
    }

    const build = await runBuildJob(job.projectId, {
      jobId: job.id,
      onJobUpdate: updateBuildProjectJob,
    })
    await mirrorProjectRecord(build.project)

    const castformRun = await maybeAutoLaunchCastformRun(job.projectId)
    await appendSupabaseTrainingEvent({
      projectId: job.projectId,
      jobId: job.id,
      runId: castformRun?.id,
      eventType: "build_job_completed",
      message: castformRun
        ? `Build completed and Castform run ${castformRun.id} was created.`
        : "Build completed.",
      payload: {
        status: build.project.status,
        castformRunId: castformRun?.id,
      },
    })

    return {
      status: "processed",
      projectId: job.projectId,
      jobId: job.id,
      castformRunId: castformRun?.id,
      kind: job.kind,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown build worker error"
    await markAnyJobFailed(job, message)
    await appendSupabaseTrainingEvent({
      projectId: job.projectId,
      jobId: job.id,
      level: "error",
      eventType: "job_failed",
      message,
      payload: { kind: job.kind },
    })

    return {
      status: "failed",
      projectId: job.projectId,
      jobId: job.id,
      error: message,
    }
  }
}

export async function runBuildWorkerLoop(options: WorkerOptions & { intervalMs?: number } = {}) {
  const intervalMs = options.intervalMs ?? 2500

  for (;;) {
    const result = await processOneBuildJob(options)

    if (result.status === "idle") {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
}
