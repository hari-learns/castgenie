import { loadEnvConfig } from "@next/env"
import { nanoid } from "nanoid"

async function main() {
  loadEnvConfig(process.cwd())
  process.env.CASTFORM_AUTO_LAUNCH = "false"
  process.env.MOCK_MODE = process.env.MOCK_MODE ?? "false"

  const { createProjectRecord, mirrorProjectRecord, updateProjectRecord } = await import("@/server/storage/repository")
  const { defaultSourceConfig, persistUploadedSources } = await import("@/server/sources/source-intake")
  const { enqueueBuildProjectJob, updateBuildProjectJob } = await import("@/server/jobs/queue")
  const { runBuildJob } = await import("@/server/jobs/runner")
  const { writeDemoReport } = await import("@/server/demo/report")

  const projectId = `demo_local_${nanoid(8)}`
  const prompt =
    "Build a SEBI LODR compliance assistant for Indian listed-company teams. It should explain compliance officer obligations, summarize source-backed rules, and create review checklists from provided material."
  const sourceConfig = defaultSourceConfig({
    allowedDomains: "sebi.gov.in",
    maxSources: 4,
    permissionAttested: true,
    allowWebDiscovery: false,
  })
  const project = await createProjectRecord({
    id: projectId,
    name: "Local SEBI demo model",
    prompt,
    sourceConfig,
  })
  const file = new File(
    [
      [
        "# SEBI LODR compliance officer local demo source",
        "",
        "## Compliance officer role",
        "A listed entity should maintain a clear compliance officer workflow for regulatory filings, board reporting, and evidence retention.",
        "",
        "## Review checklist",
        "A useful assistant should identify the rule being reviewed, ask for facts, cite source context, and avoid claiming non-compliance without enough evidence.",
        "",
        "## Training quality",
        "Questions and answers must cite source chunks and mark uncertainty when the source text is incomplete.",
      ].join("\n"),
    ],
    "sebi-lodr-local-demo.md",
    { type: "text/markdown" }
  )
  const uploadManifest = await persistUploadedSources({
    projectId: project.id,
    files: [file],
    sourceConfig: {
      vertical: "legal_compliance",
      allowedDomains: "sebi.gov.in",
      maxSources: 4,
      permissionAttested: true,
      allowWebDiscovery: false,
    },
  })
  await updateProjectRecord(project.id, { sourceConfig: uploadManifest.sourceConfig })
  const job = await enqueueBuildProjectJob(project.id, {
    source: "demo_local",
    hasUploads: true,
  })
  const build = await runBuildJob(project.id, {
    jobId: job.id,
    onJobUpdate: updateBuildProjectJob,
  })
  await mirrorProjectRecord(build.project)
  const report = await writeDemoReport({ projectId: project.id, mode: "local" })
  console.log(JSON.stringify({ projectId: project.id, reportPath: report.reportPath, readyForReal: report.castform.readyForReal }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown local demo failure")
  process.exitCode = 1
})
