"use client"

import { useMemo, useState } from "react"
import {
  ArchiveIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
} from "lucide-react"

import type {
  ArtifactBrowserData,
  ArtifactFile,
  ArtifactGroup,
  ArtifactPreviewRecord,
} from "@/types/artifact-browser"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type ArtifactBrowserProps = {
  projectId: string
  data: ArtifactBrowserData
}

const groupLabels: Record<ArtifactGroup, string> = {
  manifest: "Manifest",
  imports: "Imports",
  uploads: "Uploads",
  sources: "Sources",
  corpus: "Corpus",
  datasets: "Datasets",
  rewards: "Rewards",
  logs: "Logs",
  castform_project: "Castform Project",
  other: "Other",
}

const groupOrder: ArtifactGroup[] = [
  "manifest",
  "imports",
  "uploads",
  "sources",
  "corpus",
  "datasets",
  "rewards",
  "logs",
  "castform_project",
  "other",
]

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function downloadHref(projectId: string, path: string) {
  return `/api/projects/${projectId}/artifacts/file?path=${encodeURIComponent(path)}`
}

function PreviewBlock({
  projectId,
  preview,
  copiedPath,
  onCopy,
}: {
  projectId: string
  preview: ArtifactPreviewRecord
  copiedPath: string | null
  onCopy: (path: string) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{preview.path}</p>
          {preview.truncated ? (
            <p className="text-xs text-muted-foreground">Preview truncated.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!preview.exists}
            onClick={() => onCopy(preview.path)}
          >
            {copiedPath === preview.path ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
            Copy
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={downloadHref(projectId, preview.path)}>
              <DownloadIcon aria-hidden="true" />
              File
            </a>
          </Button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto p-4 text-xs leading-5">
        {preview.content}
      </pre>
    </div>
  )
}

function FileRow({ projectId, file }: { projectId: string; file: ArtifactFile }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{file.path}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · {new Date(file.updatedAt).toLocaleString()}
        </p>
      </div>
      <Badge variant={file.previewable ? "secondary" : "outline"}>
        {file.previewable ? "previewable" : "binary"}
      </Badge>
      <Button size="sm" variant="outline" asChild>
        <a href={downloadHref(projectId, file.path)}>
          <DownloadIcon aria-hidden="true" />
          Download
        </a>
      </Button>
    </div>
  )
}

export function ArtifactBrowser({ projectId, data }: ArtifactBrowserProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const grouped = useMemo(() => {
    const map = new Map<ArtifactGroup, ArtifactFile[]>()

    for (const group of groupOrder) {
      map.set(group, [])
    }

    for (const file of data.files) {
      map.get(file.group)?.push(file)
    }

    return groupOrder
      .map((group) => ({ group, files: map.get(group) ?? [] }))
      .filter((item) => item.files.length > 0)
  }, [data.files])

  async function copyArtifact(path: string) {
    const response = await fetch(downloadHref(projectId, path))

    if (!response.ok) {
      return
    }

    await navigator.clipboard.writeText(await response.text())
    setCopiedPath(path)
    window.setTimeout(() => setCopiedPath(null), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <ArchiveIcon aria-hidden="true" />
        <AlertTitle>Castform export note</AlertTitle>
        <AlertDescription>
          This is a generated RAG project for Castform validation and launch.
          Review source permissions before any real training run.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button asChild>
          <a href={`/api/projects/${projectId}/export`}>
            <DownloadIcon aria-hidden="true" />
            Download Castform ZIP
          </a>
        </Button>
      </div>

      <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Artifact tree</CardTitle>
            <CardDescription>
              Files currently present under this project root.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-h-[48rem] flex-col gap-4 overflow-auto">
            {grouped.length ? (
              grouped.map(({ group, files }) => (
                <div key={group} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{groupLabels[group]}</p>
                    <Badge variant="secondary">{files.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {files.map((file) => (
                      <FileRow key={file.path} projectId={projectId} file={file} />
                    ))}
                  </div>
                  <Separator />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No artifacts found for this project.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key previews</CardTitle>
            <CardDescription>
              Core artifacts and Castform workspace files.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.previews.map((preview) => (
              <PreviewBlock
                key={preview.path}
                projectId={projectId}
                preview={preview}
                copiedPath={copiedPath}
                onCopy={copyArtifact}
              />
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Export coverage</CardTitle>
          <CardDescription>
            Required Castform RAG project files.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {[
            "castform_project/README.md",
            "castform_project/config.yaml",
            "castform_project/run.py",
            "castform_project/train_dataset.jsonl",
            "castform_project/eval_dataset.jsonl",
            "castform_project/data/corpus_manifest.json",
            "castform_project/rag_readiness.json",
            "castform_project/data/chunks.jsonl",
            "castform_project/data/train_qa.jsonl",
            "castform_project/data/eval_qa.jsonl",
            "castform_project/data/action_tasks.jsonl",
            "castform_project/rewards/reward_spec.json",
            "castform_project/src/env.py",
            "castform_project/src/dataset.py",
            "castform_project/src/tools.py",
            "castform_project/src/train.py",
            "castform_project/src/rewards.py",
          ].map((path) => {
            const exists = data.files.some((file) => file.path === path)
            return (
              <div
                key={path}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <FileTextIcon aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{path}</span>
                <Badge variant={exists ? "secondary" : "outline"}>
                  {exists ? "ready" : "missing"}
                </Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
