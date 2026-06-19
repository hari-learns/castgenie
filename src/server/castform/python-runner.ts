import { execFile } from "node:child_process"
import path from "node:path"

import { projectArtifactPath, projectRoot } from "@/lib/paths"

export async function runCastformPython(input: {
  projectId: string
  operation: "launch" | "status"
  pythonBin: string
  castformRunId?: string
}) {
  const scriptPath = path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "scripts",
    "castform_runner.py"
  )
  const args = [
    scriptPath,
    input.operation,
    "--project-root",
    projectRoot(input.projectId),
    "--workspace",
    projectArtifactPath(input.projectId, "castform_project"),
  ]

  if (input.castformRunId) {
    args.push("--castform-run-id", input.castformRunId)
  }

  return new Promise<string>((resolve, reject) => {
    execFile(
      input.pythonBin,
      args,
      {
        cwd: projectRoot(input.projectId),
        timeout: 30_000,
        env: {
          ...process.env,
          CASTFORM_API_KEY: process.env.CASTFORM_API_KEY ?? "",
          CASTFORM_BASE_URL: process.env.CASTFORM_BASE_URL ?? "",
        },
        maxBuffer: 1024 * 1024,
      },
      (error, output) => {
        if (output.trim()) {
          resolve(output)
          return
        }

        reject(error ?? new Error("Castform runner produced no output."))
      }
    )
  })
}
