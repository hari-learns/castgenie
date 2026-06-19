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
  const [vertical, setVertical] = useState("ca-accounting")
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
    formData.set("vertical", vertical)
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
            placeholder="CA Advanced Accounting assistant"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-vertical">Demo vertical</Label>
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger id="demo-vertical" className="w-full">
              <SelectValue placeholder="Choose a vertical" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ca-accounting">
                  CA Advanced Accounting
                </SelectItem>
                <SelectItem value="gst-basics">GST Basics</SelectItem>
                <SelectItem value="owasp-security">OWASP Security</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="main-prompt">Main prompt</Label>
        <Textarea
          id="main-prompt"
          name="prompt"
          className="min-h-36"
          defaultValue="Build me an expert assistant for CA Final Advanced Accounting in India. It should explain consolidation concepts, solve journal-entry style problems step-by-step, generate practice questions, and cite the source material."
          required
        />
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
        {[
          "Generate practice questions",
          "Generate eval set",
          "Generate Castform export",
        ].map((label) => (
          <label
            key={label}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <Checkbox defaultChecked />
            <span>{label}</span>
          </label>
        ))}
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <Checkbox
            checked={allowWebDiscovery}
            onCheckedChange={(checked) => setAllowWebDiscovery(checked === true)}
          />
          <span>Allow web discovery when uploads are absent</span>
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <Checkbox defaultChecked />
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
