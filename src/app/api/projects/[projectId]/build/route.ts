import { NextResponse } from "next/server"

import { enqueueBuildProjectJob } from "@/server/jobs/queue"
import { readProjectRecord } from "@/server/storage/repository"

type BuildRouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(_request: Request, context: BuildRouteContext) {
  const { projectId } = await context.params
  const project = await readProjectRecord(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const job = await enqueueBuildProjectJob(projectId, {
    source: "manual_rebuild",
  })

  return NextResponse.json({
    projectId,
    jobId: job.id,
    status: "queued",
  })
}
