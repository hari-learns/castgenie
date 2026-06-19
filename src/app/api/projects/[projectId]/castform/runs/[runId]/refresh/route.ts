import { NextResponse } from "next/server"

import {
  getCastformState,
  refreshCastformRun,
} from "@/server/castform/runs"

type RouteContext = {
  params: Promise<{
    projectId: string
    runId: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { projectId, runId } = await context.params
  const run = await refreshCastformRun(projectId, runId)

  if (!run) {
    return NextResponse.json({ error: "Castform run not found" }, { status: 404 })
  }

  const state = await getCastformState(projectId)

  return NextResponse.json({ run, state })
}
