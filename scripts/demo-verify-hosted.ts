import { loadEnvConfig } from "@next/env"

function projectArg() {
  const projectFlagIndex = process.argv.findIndex((arg) => arg === "--project" || arg === "--projectId")
  return projectFlagIndex >= 0 ? process.argv[projectFlagIndex + 1] : undefined
}

async function main() {
  loadEnvConfig(process.cwd())
  const projectId = projectArg()
  if (!projectId) {
    throw new Error("Usage: pnpm demo:verify-hosted --project <projectId>")
  }

  const { getCastformState, getHostedModelVersion, refreshCastformRun } = await import("@/server/castform/runs")
  const { writeDemoReport } = await import("@/server/demo/report")
  const state = await getCastformState(projectId)
  const latestRealRun = state?.runs.find((run) => run.mode === "real")

  if (latestRealRun && latestRealRun.status !== "complete" && latestRealRun.status !== "failed" && latestRealRun.status !== "blocked") {
    await refreshCastformRun(projectId, latestRealRun.id)
  }

  const hostedModel = await getHostedModelVersion(projectId)
  const report = await writeDemoReport({ projectId, mode: "verify_hosted" })

  console.log(JSON.stringify({
    projectId,
    hosted: Boolean(hostedModel),
    modelName: hostedModel?.modelName,
    reportPath: report.reportPath,
    castform: report.castform,
  }, null, 2))

  if (!hostedModel) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown hosted verification failure")
  process.exitCode = 1
})
