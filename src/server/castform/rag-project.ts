import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { ModelGoal } from "@/types/model-goal"
import type { RewardSpec } from "@/types/rewards"

export type CastformRagDatasetRow = {
  id: string
  question: string
  answer: string
  reference_chunks: Array<{
    id: string
    title: string
    text: string
    source_id: string
  }>
  metadata: {
    topic: string
    difficulty: QAPair["difficulty"]
    source_ids: string[]
    chunk_ids: string[]
  }
}

export type CastformRagReadiness = {
  projectId: string
  generatedAt: string
  readyForRealTraining: boolean
  corpusName: string
  realSourceCount: number
  prototypeSourceCount: number
  unknownPermissionCount: number
  blockedPermissionCount: number
  chunkCount: number
  trainRows: number
  evalRows: number
  blockingIssues: string[]
  warnings: string[]
}

export type CastformRagProjectInput = {
  projectId: string
  title: string
  domain: string
  targetUser: string
  userIntent: string
  modelGoal: ModelGoal
  sources: SourceRecord[]
  documents: DocumentRecord[]
  chunks: ChunkRecord[]
  trainQa: QAPair[]
  evalQa: QAPair[]
  actionTasksCount: number
  rewardSpec: RewardSpec
  generatedAt: string
  baseModel: string
  inferenceBaseUrl: string
}

const realSourceProviders: SourceRecord["provider"][] = [
  "exa",
  "user_upload",
  "local_folder",
]
const prototypeSourceProviders: SourceRecord["provider"][] = [
  "seed",
  "wire_neurons",
  "web_mock",
  "codebase",
  "firecrawl",
]

function jsonl(rows: unknown[]) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "")
}

function pyString(value: string) {
  return JSON.stringify(value)
}

function firstSentences(text: string, maxLength = 900) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength)
}

function yamlList(values: string[]) {
  return values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")
}

export function castformCorpusName(projectId: string) {
  return `castgenie_${projectId.replace(/[^a-zA-Z0-9_]/g, "_")}`
}

export function makeCastformSystemPrompt(input: {
  title: string
  domain: string
  targetUser: string
  userIntent: string
  capabilities: string[]
}) {
  const capabilities = input.capabilities.length
    ? input.capabilities.join(", ")
    : "answer domain questions from the project corpus"

  return [
    `You are the trained CastGenie assistant for ${input.title}.`,
    `Domain: ${input.domain}.`,
    `Target user: ${input.targetUser}.`,
    `Original user intent: ${input.userIntent}`,
    `Expected capabilities: ${capabilities}.`,
    "Use the search tool before answering domain questions.",
    "Answer only from retrieved corpus evidence.",
    "Cite the source chunk ids you relied on.",
    "If retrieved evidence is weak or missing, say that the model does not have enough source material.",
  ].join("\n")
}

export function toCastformRagDatasetRows(
  qaPairs: QAPair[],
  chunks: ChunkRecord[]
): CastformRagDatasetRow[] {
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]))

  return qaPairs.flatMap((pair) => {
    const referenceChunks = pair.chunkIds
      .map((chunkId) => chunksById.get(chunkId))
      .filter((chunk): chunk is ChunkRecord => Boolean(chunk))
      .slice(0, 4)

    if (!pair.question.trim() || !pair.expectedAnswer.trim() || referenceChunks.length === 0) {
      return []
    }

    return [
      {
        id: pair.id,
        question: pair.question,
        answer: pair.expectedAnswer,
        reference_chunks: referenceChunks.map((chunk) => ({
          id: chunk.id,
          title: chunk.title,
          text: firstSentences(chunk.text, 1400),
          source_id: chunk.sourceId,
        })),
        metadata: {
          topic: pair.topic,
          difficulty: pair.difficulty,
          source_ids: pair.sourceIds,
          chunk_ids: referenceChunks.map((chunk) => chunk.id),
        },
      },
    ]
  })
}

export function makeCastformRagReadiness(input: {
  projectId: string
  corpusName: string
  sources: SourceRecord[]
  chunks: ChunkRecord[]
  trainRows: CastformRagDatasetRow[]
  evalRows: CastformRagDatasetRow[]
  generatedAt: string
}) {
  const realSourceCount = input.sources.filter((source) =>
    realSourceProviders.includes(source.provider)
  ).length
  const prototypeSourceCount = input.sources.filter((source) =>
    prototypeSourceProviders.includes(source.provider)
  ).length
  const unknownPermissionCount = input.sources.filter(
    (source) => source.permissionStatus === "unknown"
  ).length
  const blockedPermissionCount = input.sources.filter(
    (source) => source.permissionStatus === "blocked"
  ).length
  const blockingIssues: string[] = []
  const warnings: string[] = []

  if (realSourceCount === 0) {
    blockingIssues.push("Real Castform RAG training requires uploaded or Exa sources.")
  }

  if (input.chunks.length < 3) {
    blockingIssues.push("At least 3 useful corpus chunks are required.")
  }

  if (input.trainRows.length < 1 || input.evalRows.length < 1) {
    blockingIssues.push("Castform train and eval datasets must each contain at least one valid row.")
  }

  if (unknownPermissionCount > 0) {
    blockingIssues.push(`${unknownPermissionCount} source(s) have unknown permission status.`)
  }

  if (blockedPermissionCount > 0) {
    blockingIssues.push(`${blockedPermissionCount} source(s) are blocked for training.`)
  }

  if (prototypeSourceCount > 0) {
    warnings.push("Prototype/mock/fixture sources are excluded from real-training confidence.")
  }

  return {
    projectId: input.projectId,
    generatedAt: input.generatedAt,
    readyForRealTraining: blockingIssues.length === 0,
    corpusName: input.corpusName,
    realSourceCount,
    prototypeSourceCount,
    unknownPermissionCount,
    blockedPermissionCount,
    chunkCount: input.chunks.length,
    trainRows: input.trainRows.length,
    evalRows: input.evalRows.length,
    blockingIssues,
    warnings,
  } satisfies CastformRagReadiness
}

export function makeCastformRagProject(input: CastformRagProjectInput) {
  const corpusName = castformCorpusName(input.projectId)
  const systemPrompt = makeCastformSystemPrompt({
    title: input.title,
    domain: input.domain,
    targetUser: input.targetUser,
    userIntent: input.userIntent,
    capabilities: input.modelGoal.capabilities,
  })
  const trainRows = toCastformRagDatasetRows(input.trainQa, input.chunks)
  const evalRows = toCastformRagDatasetRows(input.evalQa, input.chunks)
  const readiness = makeCastformRagReadiness({
    projectId: input.projectId,
    corpusName,
    sources: input.sources,
    chunks: input.chunks,
    trainRows,
    evalRows,
    generatedAt: input.generatedAt,
  })
  const corpusManifest = {
    projectId: input.projectId,
    corpusName,
    generatedAt: input.generatedAt,
    sourceCount: input.sources.length,
    documentCount: input.documents.length,
    chunkCount: input.chunks.length,
    sources: input.sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      provider: source.provider,
      permissionStatus: source.permissionStatus,
    })),
    chunks: input.chunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      documentId: chunk.documentId,
      sourceId: chunk.sourceId,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      keywords: chunk.keywords,
    })),
  }
  const readme = `# CastGenie Castform RAG Project

Project: ${input.title}
Domain: ${input.domain}
Generated: ${input.generatedAt}

This workspace is generated for Castform RAG training. It is not a launched run.

## What CastGenie prepared

- Real/source-reviewed corpus files under data/docs/
- Chunk manifest and JSONL chunks under data/
- Castform-native train_dataset.jsonl and eval_dataset.jsonl
- run.py with a SearchEnv-based environment
- src/ helpers for dataset loading, search tools, rewards, and launch-time inspection
- rag_readiness.json explaining whether real training is allowed

## Required before Wave 17 launch

1. Review rag_readiness.json.
2. Confirm every source permission is allowed_public, user_provided, or licensed.
3. Confirm train/eval rows are grounded in real reference_chunks.
4. Run Castform validation in Wave 17 before spending GPU credits.

Mock, fixture, seed, blocked, and unknown-permission sources are preview-only.
`
  const config = `project:
  id: ${JSON.stringify(input.projectId)}
  title: ${JSON.stringify(input.title)}
  domain: ${JSON.stringify(input.domain)}
  target_user: ${JSON.stringify(input.targetUser)}
  generated_at: ${JSON.stringify(input.generatedAt)}

castform:
  type: rag
  corpus_name: ${JSON.stringify(corpusName)}
  base_model: ${JSON.stringify(input.baseModel)}
  inference_base_url: ${JSON.stringify(input.inferenceBaseUrl)}
  launch_deferred_to_wave: 17

data:
  documents: ${input.documents.length}
  sources: ${input.sources.length}
  chunks: ${input.chunks.length}
  train_rows: ${trainRows.length}
  eval_rows: ${evalRows.length}
  action_tasks: ${input.actionTasksCount}

paths:
  run: run.py
  docs_dir: data/docs
  chunks: data/chunks.jsonl
  corpus_manifest: data/corpus_manifest.json
  train_dataset: train_dataset.jsonl
  eval_dataset: eval_dataset.jsonl
  reward_spec: rewards/reward_spec.json
  readiness: rag_readiness.json

policy:
  require_source_permission_review: true
  allowed_source_statuses:
${yamlList(["allowed_public", "user_provided", "licensed"])}
  blocked_source_statuses:
${yamlList(["unknown", "blocked"])}
`
  const datasetPy = `"""Dataset loading helpers for the generated CastGenie RAG project."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def load_train_dataset() -> list[dict[str, Any]]:
    return read_jsonl(ROOT / "train_dataset.jsonl")


def load_eval_dataset() -> list[dict[str, Any]]:
    return read_jsonl(ROOT / "eval_dataset.jsonl")
`
  const toolsPy = `"""Local search helpers used by the generated RAG environment."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CHUNKS_PATH = ROOT / "data" / "chunks.jsonl"


def _tokenize(value: str) -> set[str]:
    return {part.lower() for part in value.replace("-", " ").split() if len(part) > 3}


def load_chunks() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in CHUNKS_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


class LocalJsonlSearch:
    def __init__(self, top_k: int = 5):
        self.top_k = top_k
        self._chunks = load_chunks()

    def search(self, query: str, top_k: int | None = None) -> list[dict[str, Any]]:
        query_terms = _tokenize(query)
        scored: list[tuple[int, dict[str, Any]]] = []
        for chunk in self._chunks:
            text = f"{chunk.get('title', '')} {chunk.get('text', '')}"
            score = len(query_terms.intersection(_tokenize(text)))
            if score > 0:
                scored.append((score, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "id": chunk.get("id"),
                "title": chunk.get("title"),
                "text": chunk.get("text"),
                "source_id": chunk.get("sourceId") or chunk.get("source_id"),
                "score": score,
            }
            for score, chunk in scored[: top_k or self.top_k]
        ]
`
  const rewardsPy = `"""Validity-first reward helpers for CastGenie RAG training."""

from __future__ import annotations

import re
from typing import Any


def extract_text(messages: list[Any]) -> str:
    if not messages:
        return ""
    last = messages[-1]
    if isinstance(last, dict):
        return str(last.get("content", ""))
    return str(getattr(last, "content", ""))


def citation_score(output: str, reference_chunks: list[dict[str, Any]]) -> float:
    if not output.strip():
        return 0.0
    wanted = {str(chunk.get("id")) for chunk in reference_chunks if chunk.get("id")}
    if not wanted:
        return 0.0
    found = set(re.findall(r"chunk_[A-Za-z0-9_\\-]+", output))
    return len(wanted.intersection(found)) / max(1, len(wanted))


def answer_overlap_score(output: str, answer: str) -> float:
    output_terms = {term for term in output.lower().split() if len(term) > 4}
    answer_terms = {term for term in answer.lower().split() if len(term) > 4}
    if not answer_terms:
        return 0.0
    return min(1.0, len(output_terms.intersection(answer_terms)) / max(1, min(len(answer_terms), 12)))


def validity_first_reward(output: str, task: dict[str, Any]) -> dict[str, float]:
    reference_chunks = task.get("reference_chunks") or []
    answer = str(task.get("answer") or "")
    if not output.strip():
        return {"validity": 0.0, "citations": 0.0, "grounding": 0.0}
    citations = citation_score(output, reference_chunks)
    grounding = answer_overlap_score(output, answer)
    validity = 1.0 if citations > 0 and grounding > 0 else 0.0
    return {"validity": validity, "citations": citations, "grounding": grounding}
`
  const envPy = `"""Generated CastGenie RAG environment for Castform."""

from __future__ import annotations

from typing import Any

from benchmax.envs.base_env import BaseEnv
from benchmax.envs.types import ToolDefinition

from src.rewards import extract_text, validity_first_reward
from src.tools import LocalJsonlSearch


SYSTEM_PROMPT = ${pyString(systemPrompt)}
MAX_SEARCH_CALLS = 4


class CastGenieRagEnv(BaseEnv):
    system_prompt = SYSTEM_PROMPT
    recommended_max_turns = 5

    def __init__(self, **kwargs: Any):
        super().__init__(**kwargs)
        self.search = LocalJsonlSearch(top_k=5)

    async def list_tools(self):
        return [
            ToolDefinition(
                name="search_corpus",
                description="Search the project corpus for source chunks relevant to the user's question.",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "top_k": {"type": "integer", "minimum": 1, "maximum": 8},
                    },
                    "required": ["query"],
                },
            )
        ]

    async def run_tool(self, rollout_id, tool_name, **tool_args):
        if tool_name != "search_corpus":
            return f"Error: unknown tool {tool_name}"
        query = str(tool_args.get("query") or "").strip()
        if not query:
            return "Error: search_corpus requires a query."
        top_k = int(tool_args.get("top_k") or 5)
        results = self.search.search(query, top_k=max(1, min(top_k, 8)))
        if not results:
            return "No source chunks found for this query."
        return "\\n\\n".join(
            f"[{item['id']}] {item['title']}\\n{item['text']}" for item in results
        )

    async def compute_reward(self, rollout_id, messages, task, **kwargs):
        output = extract_text(messages)
        return validity_first_reward(output, task or {})
`
  const runPy = `"""Castform entrypoint generated by CastGenie.

This file intentionally contains no API keys and does not launch training when imported.
Wave 17 is responsible for validation and launch.
"""

from src.env import CastGenieRagEnv


Env = CastGenieRagEnv
`
  const trainPy = `"""Local inspection entrypoint for the generated CastGenie RAG project."""

from src.dataset import load_eval_dataset, load_train_dataset


def main() -> None:
    train_rows = load_train_dataset()
    eval_rows = load_eval_dataset()
    print(f"CastGenie RAG workspace: {len(train_rows)} train rows, {len(eval_rows)} eval rows")
    print("Launch is intentionally deferred to Wave 17.")


if __name__ == "__main__":
    main()
`

  return {
    corpusName,
    systemPrompt,
    trainRows,
    evalRows,
    readiness,
    files: [
      { path: "castform_project/README.md", content: readme },
      { path: "castform_project/config.yaml", content: config },
      { path: "castform_project/run.py", content: runPy },
      { path: "castform_project/train_dataset.jsonl", content: jsonl(trainRows) },
      { path: "castform_project/eval_dataset.jsonl", content: jsonl(evalRows) },
      {
        path: "castform_project/data/corpus_manifest.json",
        content: `${JSON.stringify(corpusManifest, null, 2)}\n`,
      },
      {
        path: "castform_project/rag_readiness.json",
        content: `${JSON.stringify(readiness, null, 2)}\n`,
      },
      { path: "castform_project/src/env.py", content: envPy },
      { path: "castform_project/src/dataset.py", content: datasetPy },
      { path: "castform_project/src/tools.py", content: toolsPy },
      { path: "castform_project/src/rewards.py", content: rewardsPy },
      { path: "castform_project/src/train.py", content: trainPy },
    ],
  }
}
