export type CastformRunMode = "mock" | "real"

export type CastformRunStatus = "blocked" | "queued" | "running" | "complete" | "failed"

export type TrainingReadinessArtifact = {
  path: string
  label: string
  required: boolean
  exists: boolean
  count?: number
}

export type TrainingReadiness = {
  projectId: string
  readyForMock: boolean
  readyForReal: boolean
  generatedAt: string
  artifacts: TrainingReadinessArtifact[]
  datasetCounts: {
    chunks: number
    trainQa: number
    evalQa: number
    actionTasks: number
  }
  sourcePermissions: {
    total: number
    allowedPublic: number
    userProvided: number
    licensed: number
    unknown: number
    blocked: number
  }
  rewardSpecPresent: boolean
  traceCounts: {
    chat: number
    action: number
    feedback: number
  }
  blockingIssues: string[]
  warnings: string[]
}

export type CastformProviderLog = {
  id: string
  projectId: string
  runId?: string
  mode: CastformRunMode
  operation: "readiness" | "create_run" | "refresh_run"
  status: "success" | "blocked" | "failed"
  message: string
  createdAt: string
}

export type CastformRun = {
  id: string
  projectId: string
  mode: CastformRunMode
  status: CastformRunStatus
  createdAt: string
  updatedAt: string
  readiness: TrainingReadiness
  artifactPaths: {
    workspace: string
    config: string
    chunks: string
    trainQa: string
    evalQa: string
    actionTasks: string
    rewardSpec: string
  }
  progress: number
  statusUrl?: string
  castformRunId?: string
  modelEndpoint?: string
  refreshCount: number
  error?: string
}

export type ModelVersion = {
  id: string
  projectId: string
  sourceRunId: string
  status: "mock_ready" | "hosted" | "failed"
  createdAt: string
  updatedAt: string
  corpusSummary: {
    sources: number
    chunks: number
  }
  datasetSummary: {
    trainQa: number
    evalQa: number
    actionTasks: number
  }
  castformRunId?: string
  statusUrl?: string
  modelEndpoint?: string
  modelName?: string
}

export type CastformRunsResponse = {
  readiness: TrainingReadiness
  latestRun: CastformRun | null
  runs: CastformRun[]
  modelVersions: ModelVersion[]
  config: {
    realRunsEnabled: boolean
    autoLaunchEnabled: boolean
    hasApiKey: boolean
    hasBaseUrl: boolean
    inferenceBaseUrl: string
    baseModel: string
    pythonBin: string
  }
}
