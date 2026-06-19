export type UploadedSourceStatus = "parsed" | "stored_skipped" | "rejected"

export type UploadedSourceKind = "text" | "markdown" | "json" | "jsonl" | "csv" | "pdf" | "unsupported"

export type UploadedSourceFile = {
  id: string
  originalName: string
  storedName: string
  relativePath: string
  mediaType: string
  extension: string
  size: number
  kind: UploadedSourceKind
  status: UploadedSourceStatus
  parseStatus: "parsed" | "skipped_pdf" | "skipped_unsupported" | "rejected"
  warning?: string
  createdAt: string
}

export type SourceConfig = {
  vertical?: string
  allowedDomains?: string
  maxSources: number
  permissionAttested: boolean
  allowWebDiscovery: boolean
  uploadedFileCount: number
  parseableFileCount: number
  skippedFileCount: number
  warnings: string[]
  updatedAt: string
}

export type UploadManifest = {
  projectId: string
  sourceConfig: SourceConfig
  files: UploadedSourceFile[]
}

export type UploadParseReport = {
  adapterId: "uploaded-file"
  parsedFiles: number
  skippedFiles: number
  rejectedFiles: number
  generatedDocuments: number
  warnings: string[]
  files: Array<{
    id: string
    originalName: string
    storedName: string
    status: UploadedSourceStatus
    parseStatus: UploadedSourceFile["parseStatus"]
    warning?: string
  }>
}
