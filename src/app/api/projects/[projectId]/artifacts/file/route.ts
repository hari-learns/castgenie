import path from "node:path"

import { NextResponse } from "next/server"

import { readProject } from "@/lib/storage"
import {
  downloadName,
  readProjectArtifactBuffer,
} from "@/server/artifacts/project-artifacts"

type RouteProps = {
  params: Promise<{
    projectId: string
  }>
}

function contentType(relativePath: string) {
  const extension = path.extname(relativePath)

  if (extension === ".json") return "application/json; charset=utf-8"
  if (extension === ".jsonl") return "application/x-ndjson; charset=utf-8"
  if (extension === ".md") return "text/markdown; charset=utf-8"
  if (extension === ".yaml" || extension === ".yml") return "application/yaml; charset=utf-8"
  if (extension === ".py") return "text/x-python; charset=utf-8"
  if (extension === ".log" || extension === ".txt") return "text/plain; charset=utf-8"
  return "application/octet-stream"
}

export async function GET(request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const relativePath = url.searchParams.get("path")

  if (!relativePath) {
    return NextResponse.json({ error: "Missing artifact path" }, { status: 400 })
  }

  try {
    const buffer = await readProjectArtifactBuffer(projectId, relativePath)
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType(relativePath),
        "Content-Disposition": `attachment; filename="${downloadName(projectId, relativePath)}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
  }
}
