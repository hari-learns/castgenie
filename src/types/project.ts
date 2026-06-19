import type { DomainSpec } from "@/types/domain"

export type ProjectStatus =
  | "draft"
  | "queued"
  | "planning"
  | "planning_sources"
  | "importing_sources"
  | "discovering_sources"
  | "extracting_documents"
  | "normalizing_domain"
  | "cleaning_corpus"
  | "chunking"
  | "indexing"
  | "generating_datasets"
  | "generating_actions"
  | "generating_rewards"
  | "exporting_castform"
  | "training_castform"
  | "model_ready"
  | "ready"
  | "failed"

export type BuildStepStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped"

export type BuildStep = {
  id: string
  label: string
  description: string
  status: BuildStepStatus
  startedAt?: string
  finishedAt?: string
  message?: string
}

export type Project = {
  id: string
  name: string
  prompt: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  domainSpec?: DomainSpec
  metrics: {
    sources: number
    documents: number
    chunks: number
    trainQa: number
    evalQa: number
    practiceQuestions: number
  }
  artifactRoot: string
  steps: BuildStep[]
  generatedFiles?: string[]
}
