import { maybeAutoLaunchCastformRun } from "@/server/castform/runs"
import {
  claimNextBuildProjectJob,
  defaultWorkerId,
  markBuildProjectJobFailed,
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
    }
  | {
      status: "failed"
      projectId: string
      jobId: string
      error: string
    }

export async function processOneBuildJob(options: WorkerOptions = {}): Promise<WorkerResult> {
  const workerId = options.workerId ?? defaultWorkerId()
  const job = await claimNextBuildProjectJob(workerId)

  if (!job) {
    return { status: "idle" }
  }

  await appendSupabaseTrainingEvent({
    projectId: job.projectId,
    jobId: job.id,
    eventType: "build_job_claimed",
    message: `Build job ${job.id} claimed by ${workerId}.`,
    payload: { workerId },
  })

  try {
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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown build worker error"
    await markBuildProjectJobFailed(job, message)
    await appendSupabaseTrainingEvent({
      projectId: job.projectId,
      jobId: job.id,
      level: "error",
      eventType: "build_job_failed",
      message,
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
