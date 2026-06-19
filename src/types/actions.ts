import type { ModelCapability } from "@/types/model-goal"

export type ActionOutputFormat =
  | "lesson"
  | "mcq_set"
  | "question_paper"
  | "answer_key"
  | "audit_report"
  | "chat_answer"

export type ActionTemplate = {
  id: string
  label: string
  description: string
  capability: ModelCapability
  inputSchema: Record<string, unknown>
  outputFormat: ActionOutputFormat
  retrievalPolicy: {
    requiredTags?: string[]
    maxChunks: number
    requireCitations: boolean
  }
}

export type ActionTask = {
  id: string
  actionId: string
  prompt: string
  expectedFormat: ActionOutputFormat
  sourceIds: string[]
  chunkIds: string[]
  rubric: string[]
}
