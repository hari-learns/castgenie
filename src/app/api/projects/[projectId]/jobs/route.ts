import { NextResponse } from "next/server"

import { readBuildLogs } from "@/lib/storage"
import { readLatestBuildProjectJob } from "@/server/jobs/queue"
import { readProjectRecord } from "@/server/storage/repository"

type JobsRouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(_request: Request, context: JobsRouteContext) {
  const { projectId } = await context.params
  const project = await readProjectRecord(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [job, logs] = await Promise.all([
    readLatestBuildProjectJob(projectId),
    readBuildLogs(projectId),
  ])

  return NextResponse.json({ job, logs })
}
