export type JobStatus = "queued" | "running" | "complete" | "failed" | "cancelled"

export type BuildJob = {
  id: string
  projectId: string
  status: JobStatus
  currentStep?: string
  progress: number
  createdAt: string
  updatedAt: string
  error?: string
}

export type BuildLogRecord = {
  timestamp: string
  jobId: string
  projectId: string
  stepId: string
  status: "started" | "complete" | "failed"
  message: string
}
