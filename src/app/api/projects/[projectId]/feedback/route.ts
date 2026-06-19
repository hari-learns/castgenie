import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { z } from "zod"

import { appendFeedbackTrace, readProject } from "@/lib/storage"
import type { FeedbackTrace } from "@/types/traces"

const feedbackSchema = z.object({
  traceType: z.enum(["chat", "action"]),
  traceId: z.string().trim().min(1).max(80),
  rating: z.enum(["up", "down"]),
  note: z.string().trim().max(1000).optional(),
})

type RouteProps = {
  params: Promise<{
    projectId: string
  }>
}

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId } = await params
  const body = await request.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid feedback input",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const project = await readProject(projectId)

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const record: FeedbackTrace = {
    id: `feedback_${nanoid(10)}`,
    projectId,
    traceType: parsed.data.traceType,
    traceId: parsed.data.traceId,
    rating: parsed.data.rating,
    note: parsed.data.note,
    createdAt: new Date().toISOString(),
  }
  await appendFeedbackTrace(record)

  return NextResponse.json({ feedbackId: record.id })
}
