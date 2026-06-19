import { describe, expect, it } from "vitest"

import { createQueuedBuildJobRecord } from "@/server/jobs/queue"

describe("job queue records", () => {
  it("creates a queued build job with deterministic contract fields", () => {
    const job = createQueuedBuildJobRecord("project_123", {
      source: "create_project",
      hasUploads: false,
    })

    expect(job.id).toMatch(/^job_/)
    expect(job.projectId).toBe("project_123")
    expect(job.kind).toBe("build_project")
    expect(job.status).toBe("queued")
    expect(job.currentStep).toBe("queued")
    expect(job.progress).toBe(0)
    expect(job.attempts).toBe(0)
    expect(job.maxAttempts).toBe(3)
    expect(job.payload).toEqual({
      source: "create_project",
      hasUploads: false,
    })
  })
})
