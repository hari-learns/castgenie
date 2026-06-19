import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { projectRoot } from "@/lib/paths"
import { computeTrainingReadiness } from "@/server/castform/runs"

const projectId = "vitest-readiness-project"
const root = projectRoot(projectId)

async function write(relativePath: string, content: string) {
  const filePath = path.join(root, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
}

async function writeCommonArtifacts() {
  await write(
    "chunks.jsonl",
    [1, 2, 3].map((index) => JSON.stringify({ id: `chunk_${index}` })).join("\n") + "\n"
  )
  await write("datasets/train_qa.jsonl", `${JSON.stringify({ id: "train_1" })}\n`)
  await write("datasets/eval_qa.jsonl", `${JSON.stringify({ id: "eval_1" })}\n`)
  await write("datasets/action_tasks.jsonl", `${JSON.stringify({ id: "action_1" })}\n`)
  await write("rewards/reward_spec.json", JSON.stringify({ id: "reward" }))
  await write("castform_project/config.yaml", "project:\n  id: vitest\n")
  await write("castform_project/run.py", "from src.env import CastGenieRagEnv\n")
  await write(
    "castform_project/train_dataset.jsonl",
    `${JSON.stringify({
      id: "train_1",
      question: "What does the source say?",
      answer: "Use chunk_1.",
      reference_chunks: [{ id: "chunk_1", text: "Source text" }],
    })}\n`
  )
  await write(
    "castform_project/eval_dataset.jsonl",
    `${JSON.stringify({
      id: "eval_1",
      question: "What evidence is available?",
      answer: "Use chunk_2.",
      reference_chunks: [{ id: "chunk_2", text: "Source text" }],
    })}\n`
  )
  await write(
    "castform_project/rag_readiness.json",
    JSON.stringify({
      readyForRealTraining: true,
      blockingIssues: [],
      warnings: [],
    })
  )
}

describe("computeTrainingReadiness", () => {
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it("blocks real training when source permissions are unknown", async () => {
    await write(
      "source_manifest.json",
      JSON.stringify([
        {
          id: "source_unknown",
          title: "Unknown source",
          url: "https://example.com",
          provider: "exa",
          domain: "example.com",
          fetchedAt: "2026-06-19T00:00:00.000Z",
          permissionStatus: "unknown",
        },
      ])
    )
    await writeCommonArtifacts()

    const readiness = await computeTrainingReadiness(projectId)

    expect(readiness.readyForMock).toBe(true)
    expect(readiness.readyForReal).toBe(false)
    expect(readiness.blockingIssues.join(" ")).toContain("unknown permission")
  })

  it("passes real readiness for complete user-provided artifacts", async () => {
    await write(
      "source_manifest.json",
      JSON.stringify([
        {
          id: "source_user",
          title: "User source",
          url: "upload://source.md",
          provider: "user_upload",
          domain: "user-provided",
          fetchedAt: "2026-06-19T00:00:00.000Z",
          permissionStatus: "user_provided",
        },
      ])
    )
    await writeCommonArtifacts()

    const readiness = await computeTrainingReadiness(projectId)

    expect(readiness.readyForReal).toBe(true)
    expect(readiness.blockingIssues).toHaveLength(0)
  })
})
