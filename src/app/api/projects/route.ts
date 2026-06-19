import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { z } from "zod"

import { createProject, listProjects } from "@/lib/storage"
import { runBuildJob } from "@/server/jobs/runner"

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  prompt: z.string().trim().min(20).max(4000),
  vertical: z.string().trim().max(80).optional(),
  allowedDomains: z.string().trim().max(2000).optional(),
  maxSources: z.coerce.number().int().min(1).max(50).optional(),
})

function defaultName(prompt: string) {
  const normalized = prompt.toLowerCase()

  if (normalized.includes("owasp") || normalized.includes("security")) {
    return "OWASP security model"
  }

  if (normalized.includes("ca") || normalized.includes("accounting")) {
    return "CA ed-tech model"
  }

  return "Custom expert model"
}

export async function GET() {
  const projects = await listProjects()
  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid project input",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const projectId = nanoid(10)
  const prompt = parsed.data.prompt
  const project = await createProject({
    id: projectId,
    name: parsed.data.name || defaultName(prompt),
    prompt,
  })
  const build = await runBuildJob(project.id)

  return NextResponse.json({
    projectId: project.id,
    jobId: build.jobId,
    redirectTo: `/projects/${project.id}`,
  })
}
