export type ArtifactGroup =
  | "manifest"
  | "imports"
  | "uploads"
  | "sources"
  | "corpus"
  | "datasets"
  | "rewards"
  | "logs"
  | "castform_project"
  | "other"

export type ArtifactFile = {
  path: string
  name: string
  group: ArtifactGroup
  size: number
  updatedAt: string
  previewable: boolean
}

export type ArtifactPreviewRecord = {
  path: string
  content: string
  exists: boolean
  truncated: boolean
}

export type ArtifactBrowserData = {
  files: ArtifactFile[]
  previews: ArtifactPreviewRecord[]
}
