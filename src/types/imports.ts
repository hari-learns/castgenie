import type { DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"

export type PermissionRecord = {
  sourceId: string
  status: "unknown" | "public_allowed" | "user_provided" | "licensed" | "blocked"
  note: string
}

export type DomainGraphNode = {
  id: string
  kind: "exam" | "paper" | "chapter" | "topic" | "task" | "code_area"
  title: string
  parentId?: string
  tags: string[]
  metadata?: Record<string, string | number | boolean>
}

export type ImportedDomainBundle = {
  sources: SourceRecord[]
  documents: DocumentRecord[]
  domainGraph: DomainGraphNode[]
  questions: QAPair[]
  permissions: PermissionRecord[]
  qualityTags: Array<{ nodeId: string; tags: string[] }>
}
