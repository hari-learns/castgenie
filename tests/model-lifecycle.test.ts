import { describe, expect, it } from "vitest"

import { deriveModelLifecycle } from "@/lib/model-lifecycle"
import type { CastformRunsResponse } from "@/types/castform"

function state(
  patch: Partial<CastformRunsResponse> = {}
): CastformRunsResponse {
  return {
    readiness: {
      projectId: "project_123",
      readyForMock: true,
      readyForReal: false,
      generatedAt: "2026-06-20T00:00:00.000Z",
      artifacts: [],
      datasetCounts: {
        chunks: 0,
        trainQa: 0,
        evalQa: 0,
        actionTasks: 0,
      },
      sourcePermissions: {
        total: 0,
        allowedPublic: 0,
        userProvided: 0,
        licensed: 0,
        unknown: 0,
        blocked: 0,
      },
      rewardSpecPresent: false,
      traceCounts: {
        chat: 0,
        action: 0,
        feedback: 0,
      },
      blockingIssues: ["Real Castform training requires uploaded or real web sources."],
      warnings: [],
    },
    latestRun: null,
    runs: [],
    modelVersions: [],
    config: {
      realRunsEnabled: true,
      autoLaunchEnabled: true,
      hasApiKey: true,
      hasBaseUrl: false,
      inferenceBaseUrl: "https://llm.castform.com/v1",
      baseModel: "Qwen/Qwen3.5-4B",
      pythonBin: "python3.12",
    },
    ...patch,
  }
}

describe("deriveModelLifecycle", () => {
  it("treats build jobs as source preparation", () => {
    const lifecycle = deriveModelLifecycle({
      projectStatus: "queued",
      buildJob: {
        id: "job_123",
        projectId: "project_123",
        status: "running",
        currentStep: "discovering_sources",
        progress: 40,
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:01:00.000Z",
      },
      castformState: state(),
    })

    expect(lifecycle.status).toBe("preparing_sources")
    expect(lifecycle.chatEnabled).toBe(false)
    expect(lifecycle.detail).toContain("40%")
  })

  it("unlocks chat only for hosted Castform model versions", () => {
    const lifecycle = deriveModelLifecycle({
      projectStatus: "ready",
      castformState: state({
        modelVersions: [
          {
            id: "model_real_123",
            projectId: "project_123",
            sourceRunId: "castform_run_123",
            status: "hosted",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:00.000Z",
            corpusSummary: { sources: 1, chunks: 5 },
            datasetSummary: { trainQa: 1, evalQa: 1, actionTasks: 1 },
            modelName: "ft:Qwen/Qwen3.5-4B:run_123:latest",
          },
        ],
      }),
    })

    expect(lifecycle.status).toBe("model_ready")
    expect(lifecycle.chatEnabled).toBe(true)
  })

  it("shows Castform training while a real run is queued or running", () => {
    const lifecycle = deriveModelLifecycle({
      projectStatus: "ready",
      castformState: state({
        runs: [
          {
            id: "castform_run_123",
            projectId: "project_123",
            mode: "real",
            status: "running",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:01:00.000Z",
            readiness: state().readiness,
            artifactPaths: {
              workspace: "castform_project",
              config: "castform_project/config.yaml",
              chunks: "chunks.jsonl",
              trainQa: "datasets/train_qa.jsonl",
              evalQa: "datasets/eval_qa.jsonl",
              actionTasks: "datasets/action_tasks.jsonl",
              rewardSpec: "rewards/reward_spec.json",
            },
            progress: 55,
            refreshCount: 1,
            statusUrl: "https://app.castform.com/train/run_123",
          },
        ],
      }),
    })

    expect(lifecycle.status).toBe("training_castform")
    expect(lifecycle.chatEnabled).toBe(false)
    expect(lifecycle.detail).toContain("app.castform.com")
  })

  it("uses readiness blockers for training-blocked state", () => {
    const lifecycle = deriveModelLifecycle({
      projectStatus: "ready",
      castformState: state(),
    })

    expect(lifecycle.status).toBe("training_blocked")
    expect(lifecycle.chatEnabled).toBe(false)
    expect(lifecycle.firstBlocker).toContain("real web sources")
  })
})
