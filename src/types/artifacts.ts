export type SourceRecord = {
  id: string
  title: string
  url: string
  provider:
    | "seed"
    | "exa"
    | "firecrawl"
    | "user_upload"
    | "wire_neurons"
    | "local_folder"
    | "codebase"
  domain: string
  fetchedAt: string
  permissionStatus:
    | "unknown"
    | "allowed_public"
    | "user_provided"
    | "licensed"
    | "blocked"
  notes?: string
}

export type DocumentRecord = {
  id: string
  sourceId: string
  title: string
  text: string
  markdownPath: string
  tokenEstimate: number
}

export type ChunkRecord = {
  id: string
  documentId: string
  sourceId: string
  title: string
  text: string
  charStart: number
  charEnd: number
  keywords: string[]
}

export type QAPair = {
  id: string
  type: "train" | "eval" | "practice"
  topic: string
  question: string
  expectedAnswer: string
  sourceIds: string[]
  chunkIds: string[]
  difficulty: "easy" | "medium" | "hard"
}

export type ChatCitation = {
  sourceId: string
  chunkId: string
  title: string
  url?: string
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: ChatCitation[]
  createdAt: string
}
