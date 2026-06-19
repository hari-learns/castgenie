import { NextResponse } from "next/server"

import { readProject } from "@/lib/storage"
import { runBuildJob } from "@/server/jobs/runner"

type BuildRouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(_request: Request, context: BuildRouteContext) {
  const { projectId } = await context.params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const build = await runBuildJob(projectId)

  return NextResponse.json({
    projectId,
    jobId: build.jobId,
    status: build.project.status,
  })
}
