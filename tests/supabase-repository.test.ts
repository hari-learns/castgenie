import { describe, expect, it } from "vitest"

import { getSupabaseAdminClient, isSupabaseStorageEnabled } from "@/server/supabase/client"
import { projectFromSupabaseRow } from "@/server/supabase/repository"
import type { Project } from "@/types/project"

describe("Supabase repository mapping", () => {
  it("hydrates project records from the durable row fields", () => {
    const project: Project = {
      id: "project_1",
      name: "Old name",
      prompt: "Build a useful assistant from sources.",
      status: "draft",
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:00:00.000Z",
      metrics: {
        sources: 0,
        documents: 0,
        chunks: 0,
        trainQa: 0,
        evalQa: 0,
        practiceQuestions: 0,
      },
      artifactRoot: "storage/projects/project_1",
      steps: [],
    }

    const hydrated = projectFromSupabaseRow({
      id: "project_1",
      name: "Durable name",
      prompt: "Durable prompt",
      status: "queued",
      domain_spec: null,
      source_config: null,
      metrics: {
        sources: 2,
        documents: 3,
        chunks: 4,
        trainQa: 5,
        evalQa: 6,
        practiceQuestions: 7,
      },
      artifact_root: "storage/projects/project_1",
      steps: [],
      generated_files: ["manifest.json"],
      payload: project,
      created_at: "2026-06-19T01:00:00.000Z",
      updated_at: "2026-06-19T02:00:00.000Z",
    })

    expect(hydrated.name).toBe("Durable name")
    expect(hydrated.prompt).toBe("Durable prompt")
    expect(hydrated.status).toBe("queued")
    expect(hydrated.metrics.chunks).toBe(4)
    expect(hydrated.generatedFiles).toEqual(["manifest.json"])
    expect(hydrated.updatedAt).toBe("2026-06-19T02:00:00.000Z")
  })

  it("does not create a Supabase client outside Supabase storage mode", () => {
    const previousMode = process.env.CASTGENIE_STORAGE_MODE
    process.env.CASTGENIE_STORAGE_MODE = "local"

    expect(isSupabaseStorageEnabled()).toBe(false)
    expect(getSupabaseAdminClient()).toBeNull()

    if (previousMode === undefined) {
      delete process.env.CASTGENIE_STORAGE_MODE
    } else {
      process.env.CASTGENIE_STORAGE_MODE = previousMode
    }
  })
})
