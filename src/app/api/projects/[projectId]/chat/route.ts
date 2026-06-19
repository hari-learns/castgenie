import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { z } from "zod"

import { retrieveChunks } from "@/lib/retrieval"
import {
  appendChatTrace,
  readProject,
  readProjectArtifacts,
} from "@/lib/storage"
import { generateChatAnswer } from "@/server/ai/providers"
import { getHostedModelVersion } from "@/server/castform/runs"
import type { ChatMessage } from "@/types/artifacts"
import type { ChatTrace } from "@/types/traces"

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  preview: z.boolean().optional(),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
        citations: z
          .array(
            z.object({
              sourceId: z.string(),
              chunkId: z.string(),
              title: z.string(),
              url: z.string().optional(),
            })
          )
          .optional(),
        createdAt: z.string(),
      })
    )
    .max(12)
    .optional(),
})

type RouteProps = {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const body = await request.json().catch(() => null)
  const parsed = chatSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid chat input",
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
  const hostedModel = await getHostedModelVersion(projectId)

  if (!hostedModel && !parsed.data.preview) {
    return NextResponse.json(
      {
        error:
          "No hosted Castform model is ready yet. Use preview mode or wait for Castform training to complete.",
      },
      { status: 409 }
    )
  }

  const retrieval = retrieveChunks({
    query: parsed.data.message,
    chunks: artifacts.chunks,
    sources: artifacts.sources,
    maxChunks: 6,
  })
  const answer = await generateChatAnswer({
    projectName: project.name,
    domain: project.domainSpec?.domain ?? "Custom domain",
    message: parsed.data.message,
    history: (parsed.data.history ?? []) as ChatMessage[],
    retrieval,
    hostedModel,
    preview: Boolean(parsed.data.preview),
  })
  const traceId = `chat_${nanoid(10)}`
  const trace: ChatTrace = {
    id: traceId,
    type: "chat",
    projectId,
    provider: answer.provider,
    prompt: parsed.data.message,
    history: (parsed.data.history ?? []) as ChatMessage[],
    output: answer.content,
    citations: answer.citations,
    retrievedChunkIds: retrieval.chunks.map((chunk) => chunk.id),
    createdAt: new Date().toISOString(),
  }
  await appendChatTrace(trace)

  return NextResponse.json({
    traceId,
    message: {
      id: `assistant_${nanoid(8)}`,
      role: "assistant",
      content: answer.content,
      citations: answer.citations,
      createdAt: trace.createdAt,
    },
    citations: answer.citations,
    retrievedChunks: retrieval.chunks,
    provider: answer.provider,
  })
}
