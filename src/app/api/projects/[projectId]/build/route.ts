import { NextResponse } from "next/server"

import { readProject } from "@/lib/storage"
import { maybeAutoLaunchCastformRun } from "@/server/castform/runs"
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
  const castformRun = await maybeAutoLaunchCastformRun(projectId)

  return NextResponse.json({
    projectId,
    jobId: build.jobId,
    castformRunId: castformRun?.id,
    status: build.project.status,
  })
}
