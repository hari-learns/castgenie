"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

export function NewProjectForm() {
  const router = useRouter()
  const [maxSources, setMaxSources] = useState("8")
  const [selectedFileCount, setSelectedFileCount] = useState(0)
  const [permissionAttested, setPermissionAttested] = useState(false)
  const [allowWebDiscovery, setAllowWebDiscovery] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    formData.set("maxSources", maxSources)
    formData.set("permissionAttested", permissionAttested ? "true" : "false")
    formData.set("allowWebDiscovery", allowWebDiscovery ? "true" : "false")

    if (selectedFileCount > 0 && !permissionAttested) {
      setError("Confirm source rights before uploading files.")
      setIsSubmitting(false)
      return
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      setError(payload?.error ?? "Unable to create project")
      setIsSubmitting(false)
      return
    }

    const payload = (await response.json()) as { redirectTo: string }
    router.push(payload.redirectTo)
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Build failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-name">Project name</Label>
          <Input
            id="project-name"
            name="name"
            placeholder="Optional name, for example Security Review Assistant"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="domain-hint">Optional domain hint</Label>
          <Input
            id="domain-hint"
            name="vertical"
            placeholder="Leave blank if the prompt says enough"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            CastGenie infers the source plan, actions, datasets, and Castform
            workspace from the English brief. This field is only metadata.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="main-prompt">Describe the model or assistant you want</Label>
        <Textarea
          id="main-prompt"
          name="prompt"
          className="min-h-36"
          placeholder="Example: I want a model that reviews a codebase for OWASP bugs, explains each issue, suggests fixes, and creates a secure-code checklist. Or: I want an ed-tech model that generates lessons, MCQs, papers, and answer keys from my uploaded source material."
          required
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Write the outcome in plain English. You do not need to choose RAG,
          chunking, datasets, actions, rewards, or training internals.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="source-files">Source files</Label>
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex items-start gap-3">
              <UploadIcon aria-hidden="true" className="mt-1 size-4" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  id="source-files"
                  name="sources"
                  type="file"
                  multiple
                  accept=".txt,.md,.json,.jsonl,.csv,.pdf"
                  onChange={(event) =>
                    setSelectedFileCount(event.currentTarget.files?.length ?? 0)
                  }
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Parses TXT, MD, JSON, JSONL, and CSV. PDFs are stored for
                  provenance but skipped until a later extraction wave.
                </p>
              </div>
            </div>
          </div>
        </div>

        <label className="flex min-h-24 items-start gap-3 rounded-lg border border-border px-3 py-3 text-sm">
          <Checkbox
            checked={permissionAttested}
            onCheckedChange={(checked) => setPermissionAttested(checked === true)}
          />
          <span>
            I have rights to use uploaded sources for this project.
          </span>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="allowed-domains">Allowed domains</Label>
          <Textarea
            id="allowed-domains"
            name="allowedDomains"
            className="min-h-24"
            placeholder="icai.org, official public sources, user-provided documents"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="max-sources">Max sources</Label>
          <Select value={maxSources} onValueChange={setMaxSources}>
            <SelectTrigger id="max-sources" className="w-full">
              <SelectValue placeholder="Max sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="4">4 sources</SelectItem>
                <SelectItem value="8">8 sources</SelectItem>
                <SelectItem value="12">12 sources</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <Checkbox
            checked={allowWebDiscovery}
            onCheckedChange={(checked) => setAllowWebDiscovery(checked === true)}
          />
          <span>Allow web discovery when uploads are absent</span>
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <Checkbox checked disabled />
          <span>Use mock seed data if APIs are unavailable</span>
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={() => router.push("/")}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Building workspace" : "Build workspace"}
        </Button>
      </div>
    </form>
  )
}
