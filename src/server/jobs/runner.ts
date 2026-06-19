import { nanoid } from "nanoid"

import {
  appendBuildLog,
  readProject,
  writeArtifactFile,
  writeArtifactJson,
  writeArtifactJsonl,
  writeBuildJob,
  writeProject,
} from "@/lib/storage"
import { runDomainImport } from "@/server/imports/domain-import"
import { planProject, type PlannedProject } from "@/server/pipeline/mock-planner"
import { parseUploadedDocuments } from "@/server/sources/source-intake"
import type { ActionTask } from "@/types/actions"
import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { BuildJob } from "@/types/jobs"
import type {
  AdapterTraceRecord,
  DomainGraphNode,
  ImportSummary,
  PermissionRecord,
  QualityTagRecord,
} from "@/types/imports"
import type { BuildStep, Project, ProjectStatus } from "@/types/project"
import type { RewardSpec } from "@/types/rewards"
import type { SourceConfig, UploadParseReport } from "@/types/source-intake"
import type { WebDiscoveryReport, WebScrapeReport, WebSearchPlan } from "@/types/web-sources"

const stepDefinitions: Array<{
  id: string
  status: ProjectStatus
  label: string
  description: string
}> = [
  {
    id: "planning_model_goal",
    status: "planning",
    label: "Planning model goal",
    description: "Infer model behavior, target user, risk, and product actions.",
  },
  {
    id: "planning_sources",
    status: "planning_sources",
    label: "Planning sources",
    description: "Choose source kinds, permissions, and ingestion strategy.",
  },
  {
    id: "ingesting_seed_documents",
    status: "importing_sources",
    label: "Importing domain sources",
    description: "Select an import adapter and normalize domain source records.",
  },
  {
    id: "normalizing_domain",
    status: "normalizing_domain",
    label: "Normalizing domain graph",
    description: "Create domain graph nodes from planned capabilities and sources.",
  },
  {
    id: "chunking_indexing",
    status: "indexing",
    label: "Chunking and indexing",
    description: "Split source documents into retrieval-ready chunks.",
  },
  {
    id: "generating_datasets",
    status: "generating_datasets",
    label: "Generating datasets",
    description: "Create train and eval QA datasets from generated chunks.",
  },
  {
    id: "generating_actions",
    status: "generating_actions",
    label: "Generating action tasks",
    description: "Create task datasets for the generated user-facing actions.",
  },
  {
    id: "generating_rewards",
    status: "generating_rewards",
    label: "Generating reward spec",
    description: "Create validity-first reward objectives for future Castform runs.",
  },
  {
    id: "preparing_castform_workspace",
    status: "exporting_castform",
    label: "Preparing Castform workspace",
    description: "Prepare Castform-ready metadata and artifact pointers.",
  },
]

type GeneratedBundle = {
  sources: SourceRecord[]
  documents: DocumentRecord[]
  chunks: ChunkRecord[]
  domainGraph: DomainGraphNode[]
  trainQa: QAPair[]
  evalQa: QAPair[]
  practiceQuestions: string
  actionTasks: ActionTask[]
  rewardSpec: RewardSpec
  importSummary: ImportSummary
  permissions: PermissionRecord[]
  qualityTags: QualityTagRecord[]
  adapterTrace: AdapterTraceRecord[]
  uploadParseReport?: UploadParseReport
  webSearchPlan?: WebSearchPlan
  webDiscovery?: WebDiscoveryReport
  webScrapeReport?: WebScrapeReport
  castformFiles: Array<{ path: string; content: string }>
}

function now() {
  return new Date().toISOString()
}

async function markStep(
  job: BuildJob,
  step: (typeof stepDefinitions)[number],
  status: "started" | "complete" | "failed",
  progress: number,
  error?: string
) {
  const timestamp = now()
  await appendBuildLog({
    timestamp,
    jobId: job.id,
    projectId: job.projectId,
    stepId: step.id,
    status,
    message: error ?? step.description,
  })
  await writeBuildJob({
    ...job,
    status: status === "failed" ? "failed" : "running",
    currentStep: step.id,
    progress,
    updatedAt: timestamp,
    error,
  })
}

export async function runBuildJob(projectId: string) {
  const project = await readProject(projectId)

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  const job: BuildJob = {
    id: `job_${nanoid(10)}`,
    projectId,
    status: "running",
    currentStep: stepDefinitions[0]?.id,
    progress: 0,
    createdAt: now(),
    updatedAt: now(),
  }
  await writeBuildJob(job)

  try {
    const plan = planProject({ projectId, prompt: project.prompt })
    const generated = await generateBundle(projectId, plan, project.sourceConfig)
    const steps: BuildStep[] = []

    for (const [index, step] of stepDefinitions.entries()) {
      const startedAt = now()
      await markStep(job, step, "started", Math.round((index / stepDefinitions.length) * 100))
      await writeProject({
        ...project,
        status: step.status,
        domainSpec: plan.domainSpec,
        steps: [
          ...steps,
          {
            id: step.id,
            label: step.label,
            description: step.description,
            status: "running",
            startedAt,
          },
        ],
      })
      await markStep(
        job,
        step,
        "complete",
        Math.round(((index + 1) / stepDefinitions.length) * 100)
      )
      steps.push({
        id: step.id,
        label: step.label,
        description: step.description,
        status: "complete",
        startedAt,
        finishedAt: now(),
      })
    }

    await writeGeneratedArtifacts(projectId, plan, generated)

    const generatedFiles = [
      "manifest.json",
      "domain_spec.json",
      "model_goal.json",
      "source_plan.json",
      "training_plan.json",
      "imports/import_summary.json",
      "imports/permissions.json",
      "imports/quality_tags.json",
      "imports/adapter_trace.json",
      ...(generated.uploadParseReport ? ["imports/upload_parse_report.json"] : []),
      ...(generated.webSearchPlan ? ["imports/web_search_plan.json"] : []),
      ...(generated.webDiscovery ? ["imports/web_discovery.json"] : []),
      ...(generated.webScrapeReport ? ["imports/web_scrape_report.json"] : []),
      ...(project.sourceConfig ? ["uploads/upload_manifest.json"] : []),
      "domain_graph.json",
      "source_manifest.json",
      "sources.jsonl",
      ...generated.documents.map((document) => document.markdownPath),
      "chunks.jsonl",
      "datasets/train_qa.jsonl",
      "datasets/eval_qa.jsonl",
      "datasets/practice_questions.md",
      "datasets/action_tasks.jsonl",
      "rewards/reward_spec.json",
      "logs/build_logs.jsonl",
      "jobs/latest.json",
      ...generated.castformFiles.map((file) => file.path),
    ]

    const nextProject: Project = {
      ...project,
      name: project.name || plan.domainSpec.title,
      status: "ready",
      domainSpec: plan.domainSpec,
      updatedAt: now(),
      metrics: {
        sources: generated.sources.length,
        documents: generated.documents.length,
        chunks: generated.chunks.length,
        trainQa: generated.trainQa.length,
        evalQa: generated.evalQa.length,
        practiceQuestions: generated.practiceQuestions.split("\n").filter(Boolean).length,
      },
      steps,
      generatedFiles,
    }

    await writeProject(nextProject)
    await writeBuildJob({
      ...job,
      status: "complete",
      currentStep: "ready",
      progress: 100,
      updatedAt: now(),
    })

    return { project: nextProject, jobId: job.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown build failure"
    const failedStep = stepDefinitions.find((step) => step.id === job.currentStep) ?? stepDefinitions[0]
    await markStep(job, failedStep, "failed", job.progress, message)
    await writeProject({
      ...project,
      status: "failed",
      updatedAt: now(),
      steps: project.steps,
    })
    throw error
  }
}

async function writeGeneratedArtifacts(
  projectId: string,
  plan: PlannedProject,
  generated: GeneratedBundle
) {
  await writeArtifactJson(projectId, "domain_spec.json", plan.domainSpec)
  await writeArtifactJson(projectId, "model_goal.json", plan.modelGoal)
  await writeArtifactJson(projectId, "source_plan.json", plan.sourcePlan)
  await writeArtifactJson(projectId, "training_plan.json", plan.trainingPlan)
  await writeArtifactJson(projectId, "imports/import_summary.json", generated.importSummary)
  await writeArtifactJson(projectId, "imports/permissions.json", generated.permissions)
  await writeArtifactJson(projectId, "imports/quality_tags.json", generated.qualityTags)
  await writeArtifactJson(projectId, "imports/adapter_trace.json", generated.adapterTrace)
  if (generated.uploadParseReport) {
    await writeArtifactJson(projectId, "imports/upload_parse_report.json", generated.uploadParseReport)
  }
  if (generated.webSearchPlan) {
    await writeArtifactJson(projectId, "imports/web_search_plan.json", generated.webSearchPlan)
  }
  if (generated.webDiscovery) {
    await writeArtifactJson(projectId, "imports/web_discovery.json", generated.webDiscovery)
  }
  if (generated.webScrapeReport) {
    await writeArtifactJson(projectId, "imports/web_scrape_report.json", generated.webScrapeReport)
  }
  await writeArtifactJson(projectId, "domain_graph.json", generated.domainGraph)
  await writeArtifactJson(projectId, "source_manifest.json", generated.sources)
  await writeArtifactJson(projectId, "rewards/reward_spec.json", generated.rewardSpec)
  await writeArtifactJsonl(projectId, "sources.jsonl", generated.sources)
  await writeArtifactJsonl(projectId, "chunks.jsonl", generated.chunks)
  await writeArtifactJsonl(projectId, "datasets/train_qa.jsonl", generated.trainQa)
  await writeArtifactJsonl(projectId, "datasets/eval_qa.jsonl", generated.evalQa)
  await writeArtifactJsonl(projectId, "datasets/action_tasks.jsonl", generated.actionTasks)
  await writeArtifactJsonl(projectId, "castform_project/data/chunks.jsonl", generated.chunks)
  await writeArtifactJsonl(projectId, "castform_project/data/train_qa.jsonl", generated.trainQa)
  await writeArtifactJsonl(projectId, "castform_project/data/eval_qa.jsonl", generated.evalQa)
  await writeArtifactJsonl(
    projectId,
    "castform_project/data/action_tasks.jsonl",
    generated.actionTasks
  )
  await writeArtifactJson(projectId, "castform_project/rewards/reward_spec.json", generated.rewardSpec)
  await writeArtifactFile(
    projectId,
    "datasets/practice_questions.md",
    `# Practice Questions\n\n${generated.practiceQuestions}\n`
  )

  await Promise.all(
    generated.documents.map((document) =>
      writeArtifactFile(projectId, document.markdownPath, document.text)
    )
  )
  await Promise.all(
    generated.documents.map((document) =>
      writeArtifactFile(
        projectId,
        `castform_project/data/docs/${document.markdownPath.split("/").at(-1)}`,
        document.text
      )
    )
  )
  await Promise.all(
    generated.castformFiles.map((file) =>
      writeArtifactFile(projectId, file.path, file.content)
    )
  )
}

async function generateBundle(
  projectId: string,
  plan: PlannedProject,
  sourceConfig?: SourceConfig
): Promise<GeneratedBundle> {
  const uploaded = await parseUploadedDocuments(projectId)
  const effectiveSourceConfig = uploaded.manifest?.sourceConfig ?? sourceConfig
  const imported = await runDomainImport({
    projectId,
    prompt: plan.modelGoal.userIntent,
    domainKind: plan.kind,
    sourceKinds: plan.sourcePlan.requiredSourceKinds,
    allowedDomains: effectiveSourceConfig?.allowedDomains,
    mockMode: process.env.MOCK_MODE !== "false",
    allowWebDiscovery: effectiveSourceConfig?.allowWebDiscovery,
    sourceStrategy: uploaded.manifest?.files.length ? "uploaded_file" : undefined,
    uploadedFilePaths: uploaded.manifest?.files.map((file) => file.relativePath),
    limits: {
      maxSources: effectiveSourceConfig?.maxSources ?? Number(process.env.MAX_SOURCES ?? 12),
      maxChunks: Number(process.env.MAX_CHUNKS ?? 300),
      maxQaPairs: Number(process.env.MAX_QA_PAIRS ?? 60),
    },
  })
  const sources = imported.sources
  const documents = imported.documents
  const chunks = (imported.chunks?.length ? imported.chunks : makeChunks(documents)).slice(
    0,
    Number(process.env.MAX_CHUNKS ?? 300)
  )
  const domainGraph = makeDomainGraph(plan, chunks, imported.domainGraph)
  const generatedTrainQa = makeQaPairs(chunks, 18, "train")
  const trainQa = [
    ...attachQuestionChunks(imported.questions, chunks),
    ...generatedTrainQa,
  ].slice(0, 18)
  const evalQa = makeQaPairs(chunks.slice().reverse(), 8, "eval")
  const practiceQuestions = chunks
    .slice(0, 12)
    .map((chunk, index) => `${index + 1}. ${chunk.title}: create a source-grounded response with citations.`)
    .join("\n")
  const actionTasks = makeActionTasks(plan, chunks)
  const rewardSpec = makeRewardSpec(projectId, plan)
  const castformFiles = makeCastformFiles(projectId, plan, {
    sources,
    documents,
    chunks,
    trainQa,
    evalQa,
    actionTasks,
    rewardSpec,
  })

  return {
    sources,
    documents,
    chunks,
    domainGraph,
    trainQa,
    evalQa,
    practiceQuestions,
    actionTasks,
    rewardSpec,
    importSummary: imported.summary,
    permissions: imported.permissions,
    qualityTags: imported.qualityTags,
    adapterTrace: imported.adapterTrace,
    uploadParseReport: imported.uploadParseReport ?? uploaded.report ?? undefined,
    webSearchPlan: imported.webSearchPlan,
    webDiscovery: imported.webDiscovery,
    webScrapeReport: imported.webScrapeReport,
    castformFiles,
  }
}

function makeChunks(documents: DocumentRecord[]): ChunkRecord[] {
  const chunks: ChunkRecord[] = []

  for (const document of documents) {
    const sections = document.text.split(/\n(?=## )/).filter((section) => section.startsWith("## "))

    for (const section of sections) {
      const heading = section.split("\n")[0].replace(/^## /, "")
      const charStart = document.text.indexOf(section)
      chunks.push({
        id: `chunk_${String(chunks.length + 1).padStart(3, "0")}`,
        documentId: document.id,
        sourceId: document.sourceId,
        title: `${document.title} - ${heading}`,
        text: section.trim(),
        charStart,
        charEnd: charStart + section.length,
        keywords: [
          ...new Set(
            `${document.title} ${heading}`
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .split(/\s+/)
              .filter((word) => word.length > 4)
          ),
        ].slice(0, 8),
      })
    }
  }

  return chunks
}

function attachQuestionChunks(questions: QAPair[], chunks: ChunkRecord[]): QAPair[] {
  if (chunks.length === 0) {
    return questions
  }

  return questions.map((question, index) => {
    const matchedChunk =
      chunks.find((chunk) =>
        question.sourceIds.some((sourceId) => sourceId === chunk.sourceId)
      ) ?? chunks[index % chunks.length]

    return {
      ...question,
      sourceIds: question.sourceIds.length
        ? question.sourceIds
        : [matchedChunk.sourceId],
      chunkIds: question.chunkIds.length ? question.chunkIds : [matchedChunk.id],
    }
  })
}

function makeDomainGraph(
  plan: PlannedProject,
  chunks: ChunkRecord[],
  importedNodes: DomainGraphNode[]
): DomainGraphNode[] {
  const importedNodeIds = new Set(importedNodes.map((node) => node.id))

  return [
    {
      id: "domain-root",
      kind: "exam",
      title: plan.modelGoal.domain,
      tags: [plan.kind, plan.modelGoal.riskLevel],
    },
    ...plan.modelGoal.generatedActions.map((action): DomainGraphNode => ({
      id: `task-${action.id}`,
      kind: "task",
      title: action.label,
      parentId: "domain-root",
      tags: [action.capability, action.outputFormat],
    })),
    ...importedNodes.filter((node) => node.id !== "domain-root"),
    ...chunks.slice(0, 6).map((chunk): DomainGraphNode => ({
      id: importedNodeIds.has(`topic-${chunk.id}`)
        ? `chunk-topic-${chunk.id}`
        : `topic-${chunk.id}`,
      kind: "topic",
      title: chunk.title,
      parentId: "domain-root",
      tags: chunk.keywords,
    })),
  ]
}

function makeQaPairs(chunks: ChunkRecord[], count: number, type: QAPair["type"]) {
  if (chunks.length === 0) {
    return []
  }

  return Array.from({ length: count }, (_, index): QAPair => {
    const chunk = chunks[index % chunks.length]

    return {
      id: `${type}_${String(index + 1).padStart(3, "0")}`,
      type,
      topic: chunk.title,
      question: `Using the source chunk "${chunk.title}", produce a source-grounded ${type} answer.`,
      expectedAnswer: `Answer must cite ${chunk.id}, explain the concept, and avoid unsupported claims.`,
      sourceIds: [chunk.sourceId],
      chunkIds: [chunk.id],
      difficulty: index % 5 === 0 ? "hard" : index % 2 === 0 ? "medium" : "easy",
    }
  })
}

function makeActionTasks(plan: PlannedProject, chunks: ChunkRecord[]): ActionTask[] {
  return plan.modelGoal.generatedActions.flatMap((action, actionIndex) =>
    chunks.slice(0, 2).map((chunk, chunkIndex): ActionTask => ({
      id: `action_task_${String(actionIndex + 1).padStart(2, "0")}_${chunkIndex + 1}`,
      actionId: action.id,
      prompt: `${action.label}: use ${chunk.title} and produce ${action.outputFormat}.`,
      expectedFormat: action.outputFormat,
      sourceIds: [chunk.sourceId],
      chunkIds: [chunk.id],
      rubric: [
        "Uses retrieved source context",
        "Matches requested output format",
        "Includes caveats where source evidence is limited",
        "Avoids unsupported claims",
      ],
    }))
  )
}

function makeRewardSpec(projectId: string, plan: PlannedProject): RewardSpec {
  return {
    id: `reward_${projectId}`,
    projectId,
    invalidOutputReward: 0,
    objectives: [
      {
        id: "source_grounding",
        label: "Source-grounded validity",
        baseReward: 1,
        validityChecks: ["has_citation", "uses_retrieved_context", "no_unsupported_authority"],
        clusterKey: "format_and_concept",
        divideRewardByValidClusterSize: true,
      },
      {
        id: "action_format",
        label: "Action format compliance",
        baseReward: 1,
        validityChecks: plan.modelGoal.generatedActions.map((action) => `matches_${action.outputFormat}`),
        clusterKey: "concept_overlap",
        divideRewardByValidClusterSize: true,
      },
    ],
  }
}

function yamlList(values: string[]) {
  return values.map((value) => `  - ${JSON.stringify(value)}`).join("\n")
}

function makeCastformFiles(
  projectId: string,
  plan: PlannedProject,
  generated: Pick<
    GeneratedBundle,
    "sources" | "documents" | "chunks" | "trainQa" | "evalQa" | "actionTasks" | "rewardSpec"
  >
): Array<{ path: string; content: string }> {
  const generatedAt = now()
  const readme = `# CastGenie Castform Workspace

Project: ${plan.domainSpec.title}
Domain: ${plan.domainSpec.domain}
Generated: ${generatedAt}

## What this contains

This folder is a Castform-ready scaffold generated by CastGenie. It includes copied corpus documents, chunks, train/eval QA rows, action-task rows, and a reward specification.

## Required source-permission review

Do not launch real training until every source in source_manifest.json has been reviewed and confirmed as public, licensed, or explicitly user-provided for model training. Synthetic fixture data is acceptable only for prototype testing.

## Files

- data/docs/: copied source documents
- data/chunks.jsonl: retrieval chunks
- data/train_qa.jsonl: training QA rows
- data/eval_qa.jsonl: evaluation QA rows
- data/action_tasks.jsonl: action-task rows
- rewards/reward_spec.json: reward scaffold
- src/train.py: inert training entrypoint scaffold
- src/environment.py: local environment helper scaffold
- src/rewards.py: reward helper scaffold

## Running

The Python files intentionally do not import Castform at module load and do not make network calls. They are placeholders for a later Castform SDK integration wave.
`
  const config = `project:
  id: ${JSON.stringify(projectId)}
  title: ${JSON.stringify(plan.domainSpec.title)}
  domain: ${JSON.stringify(plan.domainSpec.domain)}
  target_user: ${JSON.stringify(plan.domainSpec.targetUser)}
  generated_at: ${JSON.stringify(generatedAt)}

data:
  documents: ${generated.documents.length}
  sources: ${generated.sources.length}
  chunks: ${generated.chunks.length}
  train_qa: ${generated.trainQa.length}
  eval_qa: ${generated.evalQa.length}
  action_tasks: ${generated.actionTasks.length}

paths:
  docs_dir: data/docs
  chunks: data/chunks.jsonl
  train_qa: data/train_qa.jsonl
  eval_qa: data/eval_qa.jsonl
  action_tasks: data/action_tasks.jsonl
  reward_spec: rewards/reward_spec.json

policy:
  require_source_permission_review: true
  allowed_source_statuses:
${yamlList(["allowed_public", "user_provided", "licensed"])}
  blocked_source_statuses:
${yamlList(["unknown", "blocked"])}

castform:
  mode: scaffold_only
  sdk_required: false
  launch_training: false
`
  const trainPy = `"""CastGenie Castform training scaffold.

This file is intentionally inert. It does not import the Castform SDK at module
load and does not make network calls. Wire it to a real Castform training run in
a later integration wave after source permissions are reviewed.
"""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    print("CastGenie scaffold only.")
    print(f"Workspace: {ROOT}")
    print("Review source permissions before any real training run.")


if __name__ == "__main__":
    main()
`
  const environmentPy = `"""Local environment helpers for the CastGenie scaffold."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
REWARD_SPEC = ROOT / "rewards" / "reward_spec.json"


def describe() -> dict:
    return {
        "root": str(ROOT),
        "data_dir": str(DATA_DIR),
        "reward_spec": str(REWARD_SPEC),
        "mode": "scaffold_only",
    }
`
  const rewardsPy = `"""Reward helpers for the CastGenie scaffold."""


def invalid_output_reward() -> int:
    return 0


def divide_reward_by_valid_cluster_size(base_reward: float, cluster_size: int) -> float:
    if cluster_size <= 0:
        return 0
    return base_reward / cluster_size
`

  return [
    { path: "castform_project/README.md", content: readme },
    { path: "castform_project/config.yaml", content: config },
    { path: "castform_project/src/train.py", content: trainPy },
    { path: "castform_project/src/environment.py", content: environmentPy },
    { path: "castform_project/src/rewards.py", content: rewardsPy },
  ]
}
