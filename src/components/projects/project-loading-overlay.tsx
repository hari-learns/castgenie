"use client"

import { useEffect, useMemo, useState } from "react"

import type { BuildJob, JobStatus } from "@/types/jobs"

type ProjectLoadingOverlayProps = {
  projectId: string
  initialJob?: BuildJob | null
  lifecycleLabel: string
  lifecycleDetail: string
}

const activeStatuses: JobStatus[] = ["queued", "running"]

function isActive(job?: BuildJob | null) {
  return Boolean(job?.status && activeStatuses.includes(job.status))
}

export function ProjectLoadingOverlay({
  projectId,
  initialJob,
  lifecycleLabel,
  lifecycleDetail,
}: ProjectLoadingOverlayProps) {
  const [job, setJob] = useState<BuildJob | null | undefined>(initialJob)
  const active = isActive(job)
  const statusText = useMemo(() => {
    if (job?.currentStep) {
      return `${job.currentStep.replaceAll("_", " ")} · ${job.progress}%`
    }

    return lifecycleDetail
  }, [job, lifecycleDetail])

  useEffect(() => {
    if (!active) return

    let cancelled = false
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/jobs`, {
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as { job?: BuildJob | null }
        if (cancelled) return
        setJob(payload.job ?? null)

        if (
          payload.job?.status === "complete" ||
          payload.job?.status === "failed"
        ) {
          window.clearInterval(interval)
          window.location.reload()
        }
      } catch {
        // Keep the visible loader; transient polling failures should not collapse it.
      }
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [active, projectId])

  if (!active) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/65 px-4 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label={lifecycleLabel}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-border bg-card/95 px-6 py-7 text-center shadow-lg">
        <div className="castgenie-loader-grid" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div>
          <p className="text-sm font-semibold">{lifecycleLabel}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {statusText}
          </p>
        </div>
      </div>
    </div>
  )
}
