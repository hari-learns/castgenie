"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const prompt = String(formData.get("prompt") ?? "").trim()
    const allowedDomains = String(formData.get("allowedDomains") ?? "").trim()
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || undefined,
        prompt,
        allowedDomains: allowedDomains || undefined,
        vertical,
        maxSources,
      }),
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
          "Use mock seed data if APIs are unavailable",
        ].map((label) => (
          <label
            key={label}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <Checkbox defaultChecked />
            <span>{label}</span>
          </label>
        ))}
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
