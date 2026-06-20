import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { projectRoot } from "@/lib/paths"
import { createProject } from "@/lib/storage"
import { redactSecrets, runDemoPreflight } from "@/server/demo/preflight"
import { writeDemoReport } from "@/server/demo/report"

const projectId = "vitest-demo-report"
const root = projectRoot(projectId)

async function write(relativePath: string, content: string) {
  const filePath = path.join(root, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
}

describe("Wave 19 demo hardening", () => {
  afterEach(async () => {
    delete process.env.EXA_API_KEY
    delete process.env.CASTFORM_API_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    await rm(root, { recursive: true, force: true })
  })

  it("redacts provider and service secrets from demo output", () => {
    process.env.EXA_API_KEY = "exa_test_secret"
    process.env.CASTFORM_API_KEY = "castform_test_secret"

    const output = redactSecrets("keys: exa_test_secret and castform_test_secret")

    expect(output).toBe("keys: [REDACTED] and [REDACTED]")
  })

  it("preflight can run without network checks and does not print secret values", async () => {
    process.env.EXA_API_KEY = "exa_test_secret"
    process.env.CASTFORM_API_KEY = "castform_test_secret"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "supabase_test_secret"
    process.env.CASTGENIE_STORAGE_MODE = "local"

    const report = await runDemoPreflight({
      checkBenchmax: false,
      checkExaNetwork: false,
    })
    const serialized = JSON.stringify(report)

    expect(serialized).not.toContain("exa_test_secret")
    expect(serialized).not.toContain("castform_test_secret")
    expect(serialized).not.toContain("supabase_test_secret")
    expect(report.checks.some((check) => check.id === "exa")).toBe(true)
    expect(report.checks.some((check) => check.id === "benchmax")).toBe(true)
  })

  it("keeps the real demo behind an explicit paid-run guard", async () => {
    const script = await readFile(path.join(process.cwd(), "scripts/demo-real.ts"), "utf8")

    expect(script).toContain("CASTGENIE_DEMO_REAL_RUN")
    expect(script).toContain("Refusing to run paid-capable demo")
  })

  it("keeps Exa permission status tied to allowed domains", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/server/sources/web-discovery.ts"),
      "utf8"
    )

    expect(source).toContain("includeDomains")
    expect(source).toContain('permissionStatus: allowedDomainMatch ? "allowed_public" : "unknown"')
    expect(source).toContain("sebi.gov.in")
  })

  it("writes a redacted demo report with source, corpus, Castform, and provider proof", async () => {
    await createProject({
      id: projectId,
      name: "Demo report project",
      prompt: "Build a SEBI compliance assistant with citations.",
    })
    await write(
      "source_manifest.json",
      JSON.stringify([
        {
          id: "source_1",
          title: "SEBI source",
          url: "https://www.sebi.gov.in/legal/regulations",
          provider: "exa",
          domain: "sebi.gov.in",
          fetchedAt: "2026-06-20T00:00:00.000Z",
          permissionStatus: "allowed_public",
        },
      ])
    )
    await write(
      "chunks.jsonl",
      `${JSON.stringify({
        id: "chunk_001",
        sourceId: "source_1",
        title: "SEBI chunk",
        text: "Compliance officer source text.",
      })}\n`
    )
    await write("datasets/train_qa.jsonl", `${JSON.stringify({ id: "train_1" })}\n`)
    await write("datasets/eval_qa.jsonl", `${JSON.stringify({ id: "eval_1" })}\n`)
    await write(
      "imports/web_discovery.json",
      JSON.stringify({
        provider: "exa",
        results: [
          {
            selected: true,
            url: "https://www.sebi.gov.in/legal/regulations",
          },
        ],
      })
    )
    await write(
      "logs/chat_traces.jsonl",
      `${JSON.stringify({ id: "chat_1", provider: "Castform", createdAt: "2026-06-20T00:00:00.000Z" })}\n`
    )

    const report = await writeDemoReport({ projectId, mode: "verify_hosted" })

    expect(report.projectId).toBe(projectId)
    expect(report.source.provider).toBe("exa")
    expect(report.source.permissionStatuses.allowed_public).toBe(1)
    expect(report.corpus.chunks).toBe(1)
    expect(report.providers.latestChatProvider).toBe("Castform")
    expect(report.reportPath).toContain("storage/demo-runs")
  })
})
