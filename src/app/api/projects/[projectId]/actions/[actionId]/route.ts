import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { z } from "zod"

import { retrieveChunks } from "@/lib/retrieval"
import {
  appendActionTrace,
  readProject,
  readProjectArtifacts,
} from "@/lib/storage"
import { generateActionOutput } from "@/server/ai/providers"
import type { ActionTrace } from "@/types/traces"

const actionSchema = z.object({
  topic: z.string().trim().min(1).max(300).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  count: z.coerce.number().int().min(1).max(8).optional(),
  instructions: z.string().trim().max(2000).optional(),
})

type RouteProps = {
  params: Promise<{
    projectId: string
    actionId: string
  }>
}

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId, actionId } = await params
  const body = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid action input",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const artifacts = await readProjectArtifacts(projectId)
  const action = artifacts.modelGoal?.generatedActions.find(
    (candidate) => candidate.id === actionId
  )

  if (!action) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 })
  }

  const topic = parsed.data.topic || action.label
  const query = [
    action.label,
    action.description,
    topic,
    parsed.data.difficulty,
    parsed.data.instructions,
    action.retrievalPolicy.requiredTags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
  const retrieval = retrieveChunks({
    query,
    chunks: artifacts.chunks,
    sources: artifacts.sources,
    action,
  })
  const output = await generateActionOutput({
    projectName: project.name,
    domain: project.domainSpec?.domain ?? "Custom domain",
    action,
    input: parsed.data,
    retrieval,
  })
  const traceId = `action_${nanoid(10)}`
  const trace: ActionTrace = {
    id: traceId,
    type: "action",
    projectId,
    provider: output.provider,
    actionId,
    actionLabel: action.label,
    input: parsed.data,
    output: output.content,
    citations: output.citations,
    retrievedChunkIds: retrieval.chunks.map((chunk) => chunk.id),
    createdAt: new Date().toISOString(),
  }
  await appendActionTrace(trace)

  return NextResponse.json({
    traceId,
    actionId,
    title: action.label,
    output: output.content,
    citations: output.citations,
    retrievedChunks: retrieval.chunks,
    provider: output.provider,
  })
}
