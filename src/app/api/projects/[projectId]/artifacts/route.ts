import { NextResponse } from "next/server"

import { readProject } from "@/lib/storage"
import { getArtifactBrowserData } from "@/server/artifacts/project-artifacts"

type RouteProps = {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(await getArtifactBrowserData(projectId))
}
