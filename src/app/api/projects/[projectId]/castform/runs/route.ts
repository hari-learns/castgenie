import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createCastformRun,
  getCastformState,
} from "@/server/castform/runs"

const createRunSchema = z.object({
  mode: z.enum(["mock", "real"]).default("mock"),
})

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params
  const state = await getCastformState(projectId)

  if (!state) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(state)
}

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = createRunSchema.safeParse(body ?? {})

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid Castform run request",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const run = await createCastformRun(projectId, parsed.data.mode)

  if (!run) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const state = await getCastformState(projectId)

  return NextResponse.json({ run, state })
}
