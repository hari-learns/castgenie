import { loadEnvConfig } from "@next/env"

async function main() {
  loadEnvConfig(process.cwd())

  const { processOneBuildJob, runBuildWorkerLoop } = await import("@/server/jobs/worker")
  const once = process.argv.includes("--once")

  if (once) {
    const result = await processOneBuildJob()
    console.log(JSON.stringify(result))
    return
  }

  await runBuildWorkerLoop()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown worker failure")
  process.exitCode = 1
})
