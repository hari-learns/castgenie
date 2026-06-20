import { loadEnvConfig } from "@next/env"

async function main() {
  loadEnvConfig(process.cwd())
  const { runDemoPreflight } = await import("@/server/demo/preflight")
  const report = await runDemoPreflight()

  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown demo preflight failure")
  process.exitCode = 1
})
