"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { RefreshCwIcon, UploadIcon } from "lucide-react"

import type { SourceConfig, UploadManifest, UploadParseReport } from "@/types/source-intake"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ProjectSourceManagerProps = {
  projectId: string
  sourceConfig?: SourceConfig
  uploadManifest?: UploadManifest
  uploadParseReport?: UploadParseReport
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectSourceManager({
  projectId,
  sourceConfig,
  uploadManifest,
  uploadParseReport,
}: ProjectSourceManagerProps) {
  const router = useRouter()
  const [selectedFileCount, setSelectedFileCount] = useState(0)
  const [permissionAttested, setPermissionAttested] = useState(
    Boolean(sourceConfig?.permissionAttested)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (selectedFileCount > 0 && !permissionAttested) {
      setError("Confirm source rights before uploading files.")
      return
    }

    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    formData.set("permissionAttested", permissionAttested ? "true" : "false")
    formData.set("rebuild", "true")

    const response = await fetch(`/api/projects/${projectId}/sources`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      setError(payload?.error ?? "Unable to add sources")
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Source upload failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add uploaded sources</CardTitle>
          <CardDescription>
            Uploaded text-like files become the preferred project corpus on rebuild.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1fr_18rem_auto]" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-source-files">Files</Label>
              <Input
                id="project-source-files"
                name="sources"
                type="file"
                multiple
                accept=".txt,.md,.json,.jsonl,.csv,.pdf"
                onChange={(event) =>
                  setSelectedFileCount(event.currentTarget.files?.length ?? 0)
                }
              />
              <p className="text-xs leading-5 text-muted-foreground">
                TXT, MD, JSON, JSONL, and CSV are parsed. PDFs are stored and skipped.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm">
              <Checkbox
                checked={permissionAttested}
                onCheckedChange={(checked) => setPermissionAttested(checked === true)}
              />
              <span>I have rights to use these sources.</span>
            </label>

            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <RefreshCwIcon aria-hidden="true" className="animate-spin" />
                ) : (
                  <UploadIcon aria-hidden="true" />
                )}
                Add and rebuild
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded source state</CardTitle>
          <CardDescription>
            Manifest and parse status for user-provided files.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              files: {uploadManifest?.files.length ?? 0}
            </Badge>
            <Badge variant="secondary">
              parsed: {uploadParseReport?.parsedFiles ?? sourceConfig?.parseableFileCount ?? 0}
            </Badge>
            <Badge variant="outline">
              skipped: {uploadParseReport?.skippedFiles ?? sourceConfig?.skippedFileCount ?? 0}
            </Badge>
            <Badge variant={sourceConfig?.permissionAttested ? "secondary" : "outline"}>
              permission: {sourceConfig?.permissionAttested ? "attested" : "not attested"}
            </Badge>
          </div>

          {(uploadParseReport?.warnings.length || sourceConfig?.warnings.length) ? (
            <Alert>
              <AlertTitle>Source warnings</AlertTitle>
              <AlertDescription>
                {[...(uploadParseReport?.warnings ?? []), ...(sourceConfig?.warnings ?? [])]
                  .filter(Boolean)
                  .join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}

          {uploadManifest?.files.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Warning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadManifest.files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="min-w-64 font-medium">
                        {file.originalName}
                      </TableCell>
                      <TableCell>{file.extension}</TableCell>
                      <TableCell>{file.parseStatus}</TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell className="min-w-80">
                        {file.warning ?? "Ready for corpus import."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No uploaded source files have been added to this project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
