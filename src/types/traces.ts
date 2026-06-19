import type { ActionTemplate } from "@/types/actions"
import type { ChatCitation, ChatMessage } from "@/types/artifacts"

export type ProviderName = "mock" | "gemini" | "castform"

export type RetrievedChunk = {
  id: string
  title: string
  text: string
  sourceId: string
  documentId: string
  score: number
  matchedTerms: string[]
  citation: ChatCitation
}

export type RetrievalResult = {
  query: string
  summary: string
  chunks: RetrievedChunk[]
}

export type AssistantResponse = {
  provider: ProviderName
  content: string
  citations: ChatCitation[]
}

export type ChatTrace = {
  id: string
  type: "chat"
  projectId: string
  provider: ProviderName
  prompt: string
  history: ChatMessage[]
  output: string
  citations: ChatCitation[]
  retrievedChunkIds: string[]
  createdAt: string
  error?: string
}

export type ActionTrace = {
  id: string
  type: "action"
  projectId: string
  provider: ProviderName
  actionId: string
  actionLabel: string
  input: ActionRequestInput
  output: string
  citations: ChatCitation[]
  retrievedChunkIds: string[]
  createdAt: string
  error?: string
}

export type FeedbackTrace = {
  id: string
  projectId: string
  traceType: "chat" | "action"
  traceId: string
  rating: "up" | "down"
  note?: string
  createdAt: string
}

export type ActionRequestInput = {
  topic?: string
  difficulty?: "easy" | "medium" | "hard"
  count?: number
  instructions?: string
}

export type ActionExecutionContext = {
  action: ActionTemplate
  input: ActionRequestInput
}
