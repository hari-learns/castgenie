import type { CastformRunsResponse } from "@/types/castform"
import type { BuildJob } from "@/types/jobs"
import type { ProjectStatus } from "@/types/project"

export type ModelLifecycleStatus =
  | "preparing_sources"
  | "ready_to_train"
  | "training_castform"
  | "model_ready"
  | "training_blocked"
  | "preview_only"

export type ModelLifecycle = {
  status: ModelLifecycleStatus
  label: string
  summary: string
  detail: string
  tone: "neutral" | "ready" | "working" | "blocked" | "preview"
  chatEnabled: boolean
  firstBlocker?: string
}

const buildingStatuses: ProjectStatus[] = [
  "draft",
  "queued",
  "planning",
  "planning_sources",
  "importing_sources",
  "discovering_sources",
  "extracting_documents",
  "normalizing_domain",
  "cleaning_corpus",
  "chunking",
  "indexing",
  "generating_datasets",
  "generating_actions",
  "generating_rewards",
  "exporting_castform",
]

export function deriveModelLifecycle(input: {
  projectStatus: ProjectStatus
  buildJob?: BuildJob | null
  castformState?: CastformRunsResponse | null
}): ModelLifecycle {
  const { projectStatus, buildJob, castformState } = input
  const hostedModel = castformState?.modelVersions.find(
    (version) => version.status === "hosted" && version.modelName
  )
  const latestRealRun = castformState?.runs.find((run) => run.mode === "real")
  const firstBlocker = castformState?.readiness.blockingIssues[0] ?? latestRealRun?.error

  if (hostedModel) {
    return {
      status: "model_ready",
      label: "Model ready",
      summary: "The hosted Castform model is ready.",
      detail: "Main chat and workflows now use the Castform-hosted model version.",
      tone: "ready",
      chatEnabled: true,
    }
  }

  if (
    latestRealRun &&
    (latestRealRun.status === "queued" || latestRealRun.status === "running")
  ) {
    return {
      status: "training_castform",
      label: "Training on Castform",
      summary: "CastGenie launched training and is waiting for a hosted model.",
      detail: latestRealRun.statusUrl
        ? `Track the run in Castform: ${latestRealRun.statusUrl}`
        : "Refresh the training status after Castform updates the run.",
      tone: "working",
      chatEnabled: false,
    }
  }

  if (
    buildJob?.status === "queued" ||
    buildJob?.status === "running" ||
    buildingStatuses.includes(projectStatus)
  ) {
    return {
      status: "preparing_sources",
      label: "Preparing sources",
      summary: "CastGenie is preparing the corpus, datasets, and Castform project.",
      detail: buildJob?.currentStep
        ? `${buildJob.currentStep} · ${buildJob.progress}% complete`
        : "The local worker needs to finish the build before training can start.",
      tone: "working",
      chatEnabled: false,
    }
  }

  if (latestRealRun?.status === "blocked" || latestRealRun?.status === "failed") {
    return {
      status: "training_blocked",
      label: "Training blocked",
      summary: "CastGenie cannot use this as a trained model yet.",
      detail: latestRealRun.error ?? firstBlocker ?? "Review the training panel for details.",
      tone: "blocked",
      chatEnabled: false,
      firstBlocker,
    }
  }

  if (castformState?.readiness.readyForReal) {
    return {
      status: "ready_to_train",
      label: "Ready to train",
      summary: "The project passed local readiness checks for real Castform training.",
      detail: castformState.config.autoLaunchEnabled
        ? "The worker can launch training automatically when it processes the training job."
        : "Launch a real Castform run from the Training section.",
      tone: "neutral",
      chatEnabled: false,
    }
  }

  if (castformState?.readiness.blockingIssues.length) {
    return {
      status: "training_blocked",
      label: "Training blocked",
      summary: "The project is not safe to train on Castform yet.",
      detail: firstBlocker ?? "Review source permissions and generated datasets.",
      tone: "blocked",
      chatEnabled: false,
      firstBlocker,
    }
  }

  return {
    status: "preview_only",
    label: "Preview only",
    summary: "This workspace can be inspected, but no hosted Castform model exists.",
    detail: "Use real uploaded or Exa sources, then rebuild and train before using main chat.",
    tone: "preview",
    chatEnabled: false,
  }
}
