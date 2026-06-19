import { describe, expect, it } from "vitest"

import {
  makeCastformRagProject,
  makeCastformSystemPrompt,
  toCastformRagDatasetRows,
} from "@/server/castform/rag-project"
import type { ChunkRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { ModelGoal } from "@/types/model-goal"
import type { RewardSpec } from "@/types/rewards"

const chunks: ChunkRecord[] = [
  {
    id: "chunk_001",
    documentId: "doc_1",
    sourceId: "source_1",
    title: "Policy - Eligibility",
    text: "The source says eligible users must provide documented evidence.",
    charStart: 0,
    charEnd: 72,
    keywords: ["policy", "eligibility"],
  },
]
const threeChunks: ChunkRecord[] = [
  ...chunks,
  {
    ...chunks[0],
    id: "chunk_002",
    title: "Policy - Documents",
    text: "The source says documentation must be current.",
  },
  {
    ...chunks[0],
    id: "chunk_003",
    title: "Policy - Review",
    text: "The source says HR reviews submitted evidence.",
  },
]

const qa: QAPair[] = [
  {
    id: "train_001",
    type: "train",
    topic: "Eligibility",
    question: "Who is eligible?",
    expectedAnswer: "Eligible users must provide documented evidence and cite chunk_001.",
    sourceIds: ["source_1"],
    chunkIds: ["chunk_001"],
    difficulty: "medium",
  },
]

const modelGoal: ModelGoal = {
  id: "goal_1",
  projectId: "project_1",
  userIntent: "Build a benefits-policy expert that answers employees in plain English.",
  domain: "Benefits policy",
  targetUser: "HR operations team",
  riskLevel: "medium",
  capabilities: ["answer policy questions", "draft employee explanations"],
  successCriteria: ["Answers cite policy evidence"],
  generatedActions: [],
}

const rewardSpec: RewardSpec = {
  id: "reward_1",
  projectId: "project_1",
  invalidOutputReward: 0,
  objectives: [],
}

function source(provider: SourceRecord["provider"], permissionStatus: SourceRecord["permissionStatus"]): SourceRecord {
  return {
    id: "source_1",
    title: "Benefits handbook",
    url: "upload://benefits.md",
    provider,
    domain: "hr",
    fetchedAt: "2026-06-19T00:00:00.000Z",
    permissionStatus,
  }
}

describe("Castform RAG project generator", () => {
  it("converts QA pairs into Castform RAG dataset rows with reference chunks", () => {
    const rows = toCastformRagDatasetRows(qa, chunks)

    expect(rows).toHaveLength(1)
    expect(rows[0].question).toBe("Who is eligible?")
    expect(rows[0].answer).toContain("chunk_001")
    expect(rows[0].reference_chunks[0]).toMatchObject({
      id: "chunk_001",
      source_id: "source_1",
    })
  })

  it("generates a domain-specific prompt from arbitrary English intent", () => {
    const prompt = makeCastformSystemPrompt({
      title: "Benefits policy assistant",
      domain: "Benefits policy",
      targetUser: "HR operations team",
      userIntent: "Build a benefits-policy expert that answers employees in plain English.",
      capabilities: ["answer policy questions"],
    })

    expect(prompt).toContain("Benefits policy assistant")
    expect(prompt).toContain("Build a benefits-policy expert")
    expect(prompt).not.toContain("Advanced Accounting")
    expect(prompt).not.toContain("OWASP")
  })

  it("blocks mock and fixture sources from real RAG training readiness", () => {
    const project = makeCastformRagProject({
      projectId: "project_1",
      title: "Benefits policy assistant",
      domain: "Benefits policy",
      targetUser: "HR operations team",
      userIntent: modelGoal.userIntent,
      modelGoal,
      sources: [source("web_mock", "allowed_public")],
      documents: [],
      chunks: threeChunks,
      trainQa: qa,
      evalQa: qa,
      actionTasksCount: 0,
      rewardSpec,
      generatedAt: "2026-06-19T00:00:00.000Z",
      baseModel: "Qwen/Qwen3.5-4B",
      inferenceBaseUrl: "https://llm.castform.com/v1",
    })

    expect(project.readiness.readyForRealTraining).toBe(false)
    expect(project.readiness.blockingIssues.join(" ")).toContain("uploaded or Exa")
  })

  it("generates the expected Castform RAG workspace files for real sources", () => {
    const project = makeCastformRagProject({
      projectId: "project_1",
      title: "Benefits policy assistant",
      domain: "Benefits policy",
      targetUser: "HR operations team",
      userIntent: modelGoal.userIntent,
      modelGoal,
      sources: [source("user_upload", "user_provided")],
      documents: [],
      chunks: threeChunks,
      trainQa: qa,
      evalQa: qa,
      actionTasksCount: 0,
      rewardSpec,
      generatedAt: "2026-06-19T00:00:00.000Z",
      baseModel: "Qwen/Qwen3.5-4B",
      inferenceBaseUrl: "https://llm.castform.com/v1",
    })

    expect(project.readiness.readyForRealTraining).toBe(true)
    expect(project.readiness.blockingIssues).toHaveLength(0)
    expect(project.files.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "castform_project/run.py",
        "castform_project/src/env.py",
        "castform_project/src/dataset.py",
        "castform_project/src/tools.py",
        "castform_project/src/rewards.py",
        "castform_project/src/train.py",
        "castform_project/config.yaml",
        "castform_project/train_dataset.jsonl",
        "castform_project/eval_dataset.jsonl",
        "castform_project/data/corpus_manifest.json",
        "castform_project/rag_readiness.json",
      ])
    )
    expect(project.files.find((file) => file.path === "castform_project/run.py")?.content).not.toContain("API_KEY")
  })
})
