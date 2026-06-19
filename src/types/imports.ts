import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { UploadParseReport } from "@/types/source-intake"

export type DomainImportKind = "ca_edtech" | "owasp_security" | "generic"

export type ImportSourceStrategy =
  | "synthetic_seed"
  | "wire_neurons_fixture"
  | "local_json_folder"
  | "uploaded_file"
  | "codebase_placeholder"

export type ImportInput = {
  projectId: string
  prompt: string
  domainKind: DomainImportKind
  sourceKinds: string[]
  mockMode: boolean
  sourceStrategy?: ImportSourceStrategy
  localFolderPath?: string
  uploadedFilePaths?: string[]
  limits: {
    maxSources: number
    maxChunks: number
    maxQaPairs: number
  }
}

export type ImportSummary = {
  adapterId: string
  adapterLabel: string
  strategy: ImportSourceStrategy
  sourceCount: number
  documentCount: number
  chapterCount: number
  topicCount: number
  questionCount: number
  permissionCounts: Partial<Record<SourceRecord["permissionStatus"], number>>
  warnings: string[]
}

export type QualityTagRecord = {
  nodeId: string
  domain: string
  tags: string[]
}

export type AdapterTraceRecord = {
  adapterId: string
  detected: boolean
  selected: boolean
  reason: string
}

export type PermissionRecord = {
  sourceId: string
  status: SourceRecord["permissionStatus"]
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
  adapterId: string
  summary: ImportSummary
  sources: SourceRecord[]
  documents: DocumentRecord[]
  chunks?: ChunkRecord[]
  domainGraph: DomainGraphNode[]
  questions: QAPair[]
  permissions: PermissionRecord[]
  qualityTags: QualityTagRecord[]
  adapterTrace: AdapterTraceRecord[]
  uploadParseReport?: UploadParseReport
}

export type DomainImportAdapter = {
  id: string
  label: string
  strategy: ImportSourceStrategy
  detect(input: ImportInput): Promise<boolean>
  import(input: ImportInput, trace: AdapterTraceRecord[]): Promise<ImportedDomainBundle>
}
