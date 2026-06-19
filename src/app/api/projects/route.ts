import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { z } from "zod"

import { enqueueBuildProjectJob } from "@/server/jobs/queue"
import {
  createProjectRecord,
  listProjectRecords,
  updateProjectRecord,
} from "@/server/storage/repository"
import {
  defaultSourceConfig,
  persistUploadedSources,
} from "@/server/sources/source-intake"

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(20).max(4000),
  vertical: z.string().trim().max(80).optional(),
  allowedDomains: z.string().trim().max(2000).optional(),
  maxSources: z.coerce.number().int().min(1).max(50).optional(),
  allowWebDiscovery: z.coerce.boolean().optional(),
})

const multipartProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(20).max(4000),
  vertical: z.string().trim().max(80).optional(),
  allowedDomains: z.string().trim().max(2000).optional(),
  maxSources: z.coerce.number().int().min(1).max(50).optional(),
  permissionAttested: z.coerce.boolean().optional(),
  allowWebDiscovery: z.coerce.boolean().optional(),
})

function defaultName(prompt: string) {
  const normalized = prompt.toLowerCase()

  if (normalized.includes("owasp") || normalized.includes("security")) {
    return "OWASP security model"
  }

  if (normalized.includes("ca") || normalized.includes("accounting")) {
    return "CA ed-tech model"
  }

  return "Custom expert model"
}

export async function GET() {
  const projects = await listProjectRecords()
  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const parsed = multipartProjectSchema.safeParse({
      name: formData.get("name") || undefined,
      prompt: formData.get("prompt"),
      vertical: formData.get("vertical") || undefined,
      allowedDomains: formData.get("allowedDomains") || undefined,
      maxSources: formData.get("maxSources") || undefined,
      permissionAttested:
        formData.get("permissionAttested") === "true" ||
        formData.get("permissionAttested") === "on",
      allowWebDiscovery:
        formData.get("allowWebDiscovery") === "true" ||
        formData.get("allowWebDiscovery") === "on",
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid project input",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const files = formData
      .getAll("sources")
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (files.length > 0 && !parsed.data.permissionAttested) {
      return NextResponse.json(
        { error: "Source permission attestation is required when files are uploaded." },
        { status: 400 }
      )
    }

    const projectId = nanoid(10)
    const prompt = parsed.data.prompt
    const sourceConfig = defaultSourceConfig({
      vertical: parsed.data.vertical,
      allowedDomains: parsed.data.allowedDomains,
      maxSources: parsed.data.maxSources,
      permissionAttested: Boolean(parsed.data.permissionAttested),
      allowWebDiscovery:
        parsed.data.allowWebDiscovery === undefined
          ? files.length === 0
          : parsed.data.allowWebDiscovery,
    })
    const project = await createProjectRecord({
      id: projectId,
      name: parsed.data.name || defaultName(prompt),
      prompt,
      sourceConfig,
    })

    if (files.length > 0) {
      try {
        const manifest = await persistUploadedSources({
          projectId: project.id,
          files,
          sourceConfig: {
            vertical: parsed.data.vertical,
            allowedDomains: parsed.data.allowedDomains,
            maxSources: parsed.data.maxSources ?? sourceConfig.maxSources,
            permissionAttested: true,
            allowWebDiscovery: sourceConfig.allowWebDiscovery,
          },
        })
        await updateProjectRecord(project.id, { sourceConfig: manifest.sourceConfig })
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unable to persist uploaded sources",
          },
          { status: 400 }
        )
      }
    }

    const job = await enqueueBuildProjectJob(project.id, {
      source: "create_project",
      hasUploads: files.length > 0,
    })

    return NextResponse.json({
      projectId: project.id,
      jobId: job.id,
      redirectTo: `/projects/${project.id}`,
    })
  }

  const body = await request.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid project input",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const projectId = nanoid(10)
  const prompt = parsed.data.prompt
  const project = await createProjectRecord({
    id: projectId,
    name: parsed.data.name || defaultName(prompt),
    prompt,
    sourceConfig: defaultSourceConfig({
      vertical: parsed.data.vertical,
      allowedDomains: parsed.data.allowedDomains,
      maxSources: parsed.data.maxSources,
      permissionAttested: false,
      allowWebDiscovery: parsed.data.allowWebDiscovery ?? true,
    }),
  })
  const job = await enqueueBuildProjectJob(project.id, {
    source: "create_project",
    hasUploads: false,
  })

  return NextResponse.json({
    projectId: project.id,
    jobId: job.id,
    redirectTo: `/projects/${project.id}`,
  })
}
