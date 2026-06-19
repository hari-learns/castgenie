import { NextResponse } from "next/server"

import { readBuildJob, readBuildLogs, readProject } from "@/lib/storage"

type JobsRouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(_request: Request, context: JobsRouteContext) {
  const { projectId } = await context.params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [job, logs] = await Promise.all([
    readBuildJob(projectId),
    readBuildLogs(projectId),
  ])

  return NextResponse.json({ job, logs })
}
