import { loadEnvConfig } from "@next/env"
import { nanoid } from "nanoid"

async function main() {
  loadEnvConfig(process.cwd())

  if (process.env.CASTGENIE_DEMO_REAL_RUN !== "true") {
    throw new Error("Refusing to run paid-capable demo. Set CASTGENIE_DEMO_REAL_RUN=true explicitly.")
  }

  const { runDemoPreflight } = await import("@/server/demo/preflight")
  const preflight = await runDemoPreflight()
  if (!preflight.ok) {
    throw new Error("Demo preflight failed. Run pnpm demo:preflight and fix failures before demo:real.")
  }
  if (preflight.summary.queuedJobs > 0) {
    throw new Error("Queued jobs already exist. Run pnpm worker:once until the queue is clear before demo:real.")
  }
  if (process.env.MOCK_MODE === "true") {
    throw new Error("MOCK_MODE=true blocks real source acquisition and real Castform training.")
  }

  const { createProjectRecord, mirrorProjectRecord } = await import("@/server/storage/repository")
  const { defaultSourceConfig } = await import("@/server/sources/source-intake")
  const { enqueueBuildProjectJob, updateBuildProjectJob } = await import("@/server/jobs/queue")
  const { runBuildJob } = await import("@/server/jobs/runner")
  const { maybeAutoLaunchCastformRun } = await import("@/server/castform/runs")
  const { processOneBuildJob } = await import("@/server/jobs/worker")
  const { writeDemoReport } = await import("@/server/demo/report")

  const projectId = `demo_real_${nanoid(8)}`
  const project = await createProjectRecord({
    id: projectId,
    name: "Real SEBI LODR Castform demo model",
    prompt:
      "Build a source-grounded SEBI LODR compliance assistant for Indian listed-company teams. It should explain compliance officer obligations, assess scenarios against official SEBI material, and generate review checklists with citations.",
    sourceConfig: defaultSourceConfig({
      vertical: "legal_compliance",
      allowedDomains: "sebi.gov.in",
      maxSources: 6,
      permissionAttested: false,
      allowWebDiscovery: true,
    }),
  })
  const job = await enqueueBuildProjectJob(project.id, {
    source: "demo_real",
    hasUploads: false,
    allowedDomains: "sebi.gov.in",
  })

  const build = await runBuildJob(project.id, {
    jobId: job.id,
    onJobUpdate: updateBuildProjectJob,
  })
  await mirrorProjectRecord(build.project)
  const run = await maybeAutoLaunchCastformRun(project.id)
  if (!run) {
    const report = await writeDemoReport({ projectId: project.id, mode: "real" })
    throw new Error(
      `Real Castform launch was not queued. First blocker: ${report.castform.firstBlocker ?? "unknown"}. Report: ${report.reportPath}`
    )
  }

  const workerResult = await processOneBuildJob({ workerId: "demo_real_worker" })
  const report = await writeDemoReport({ projectId: project.id, mode: "real" })
  console.log(JSON.stringify({ projectId: project.id, runId: run.id, workerResult, reportPath: report.reportPath, castform: report.castform }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown real demo failure")
  process.exitCode = 1
})
