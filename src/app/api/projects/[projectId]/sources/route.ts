import { NextResponse } from "next/server"
import { z } from "zod"

import { readProjectArtifacts } from "@/lib/storage"
import { enqueueBuildProjectJob } from "@/server/jobs/queue"
import {
  readProjectRecord,
  updateProjectRecord,
} from "@/server/storage/repository"
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
  allowWebDiscovery: z.boolean().optional(),
  rebuild: z.boolean(),
})

export async function GET(_request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProjectRecord(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [manifest, parsed, artifacts] = await Promise.all([
    readUploadManifest(projectId),
    parseUploadedDocuments(projectId),
    readProjectArtifacts(projectId),
  ])

  return NextResponse.json({
    sourceConfig: project.sourceConfig ?? manifest?.sourceConfig ?? null,
    uploadManifest: manifest,
    uploadParseReport: parsed.report,
    webSearchPlan: artifacts.webSearchPlan,
    webDiscovery: artifacts.webDiscovery,
    webScrapeReport: artifacts.webScrapeReport,
  })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProjectRecord(projectId)

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
    allowWebDiscovery:
      formData.get("allowWebDiscovery") === "true" ||
      formData.get("allowWebDiscovery") === "on",
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
    allowWebDiscovery:
      parsed.data.allowWebDiscovery ?? Boolean(project.sourceConfig?.allowWebDiscovery),
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
        allowWebDiscovery: sourceConfig.allowWebDiscovery,
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

  await updateProjectRecord(projectId, { sourceConfig: manifest.sourceConfig })

  const job = parsed.data.rebuild
    ? await enqueueBuildProjectJob(projectId, {
        source: "sources_update",
        uploadedFileCount: files.length,
      })
    : null
  const [parsedUploads, artifacts] = await Promise.all([
    parseUploadedDocuments(projectId),
    readProjectArtifacts(projectId),
  ])

  return NextResponse.json({
    projectId,
    jobId: job?.id,
    status: job ? "queued" : project.status,
    uploadManifest: manifest,
    uploadParseReport: parsedUploads.report,
    webSearchPlan: artifacts.webSearchPlan,
    webDiscovery: artifacts.webDiscovery,
    webScrapeReport: artifacts.webScrapeReport,
  })
}
