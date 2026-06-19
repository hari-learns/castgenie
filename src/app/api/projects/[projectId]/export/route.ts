import { NextResponse } from "next/server"

import { readProject } from "@/lib/storage"
import { buildProjectZip } from "@/server/artifacts/project-artifacts"

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

  const zip = await buildProjectZip(projectId)

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${projectId}-castgenie-export.zip"`,
      "Content-Length": String(zip.length),
    },
  })
}
