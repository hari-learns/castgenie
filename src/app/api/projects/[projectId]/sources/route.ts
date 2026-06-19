import { NextResponse } from "next/server"
import { z } from "zod"

import { readProject, updateProject } from "@/lib/storage"
import { runBuildJob } from "@/server/jobs/runner"
import {
  defaultSourceConfig,
  parseUploadedDocuments,
  persistUploadedSources,
  readUploadManifest,
} from "@/server/sources/source-intake"

type RouteProps = {
  params: Promise<{
    projectId: string
  }>
}

const sourceFormSchema = z.object({
  allowedDomains: z.string().trim().max(2000).optional(),
  maxSources: z.coerce.number().int().min(1).max(50).optional(),
  permissionAttested: z.boolean(),
  rebuild: z.boolean(),
})

export async function GET(_request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [manifest, parsed] = await Promise.all([
    readUploadManifest(projectId),
    parseUploadedDocuments(projectId),
  ])

  return NextResponse.json({
    sourceConfig: project.sourceConfig ?? manifest?.sourceConfig ?? null,
    uploadManifest: manifest,
    uploadParseReport: parsed.report,
  })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const formData = await request.formData()
  const parsed = sourceFormSchema.safeParse({
    allowedDomains: formData.get("allowedDomains") || project.sourceConfig?.allowedDomains,
    maxSources: formData.get("maxSources") || project.sourceConfig?.maxSources,
    permissionAttested:
      formData.get("permissionAttested") === "true" ||
      formData.get("permissionAttested") === "on",
    rebuild:
      formData.get("rebuild") === "true" ||
      formData.get("rebuild") === "on",
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid source input",
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

  const sourceConfig = defaultSourceConfig({
    vertical: project.sourceConfig?.vertical,
    allowedDomains: parsed.data.allowedDomains,
    maxSources: parsed.data.maxSources,
    permissionAttested:
      parsed.data.permissionAttested || Boolean(project.sourceConfig?.permissionAttested),
  })

  let manifest
  try {
    manifest = await persistUploadedSources({
      projectId,
      files,
      sourceConfig: {
        vertical: sourceConfig.vertical,
        allowedDomains: sourceConfig.allowedDomains,
        maxSources: sourceConfig.maxSources,
        permissionAttested: sourceConfig.permissionAttested,
      },
    })
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

  await updateProject(projectId, { sourceConfig: manifest.sourceConfig })

  const build = parsed.data.rebuild ? await runBuildJob(projectId) : null
  const parsedUploads = await parseUploadedDocuments(projectId)

  return NextResponse.json({
    projectId,
    jobId: build?.jobId,
    status: build?.project.status ?? project.status,
    uploadManifest: manifest,
    uploadParseReport: parsedUploads.report,
  })
}
