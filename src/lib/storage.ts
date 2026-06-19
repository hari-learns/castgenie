import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { ensureSeedProject } from "@/lib/demo-seed"
import { projectArtifactPath, projectRoot, projectsRoot } from "@/lib/paths"
import type { ActionTask } from "@/types/actions"
import type { ChunkRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { BuildJob, BuildLogRecord } from "@/types/jobs"
import type {
  AdapterTraceRecord,
  ImportSummary,
  PermissionRecord,
  QualityTagRecord,
} from "@/types/imports"
import type { ModelGoal } from "@/types/model-goal"
import type { SourcePlan, TrainingPlan } from "@/types/plans"
import type { Project } from "@/types/project"
import type { RewardSpec } from "@/types/rewards"
import type { ActionTrace, ChatTrace, FeedbackTrace } from "@/types/traces"

export type ArtifactPreview = {
  path: string
  content: string
}

export type ProjectArtifacts = {
  sources: SourceRecord[]
  chunks: ChunkRecord[]
  trainQa: QAPair[]
  evalQa: QAPair[]
  practiceQuestions: string
  domainSpecPreview: string
  sourceManifestPreview: string
  chunksPreview: string
  trainQaPreview: string
  evalQaPreview: string
  modelGoal?: ModelGoal
  sourcePlan?: SourcePlan
  trainingPlan?: TrainingPlan
  actionTasks: ActionTask[]
  rewardSpec?: RewardSpec
  importSummary?: ImportSummary
  permissions: PermissionRecord[]
  qualityTags: QualityTagRecord[]
  adapterTrace: AdapterTraceRecord[]
  modelGoalPreview: string
  sourcePlanPreview: string
  trainingPlanPreview: string
  actionTasksPreview: string
  rewardSpecPreview: string
  importSummaryPreview: string
  permissionsPreview: string
  qualityTagsPreview: string
  adapterTracePreview: string
}

type CreateProjectInput = {
  id: string
  name: string
  prompt: string
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T
}

export async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function parseJsonl<T>(content: string): T[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function safeArtifactPath(projectId: string, relativePath: string) {
  const root = path.resolve(projectRoot(projectId))
  const resolved = path.resolve(root, relativePath)

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Artifact path escapes project root")
  }

  return resolved
}

export async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8")
  } catch {
    return ""
  }
}

export async function createProject(input: CreateProjectInput) {
  await mkdir(projectRoot(input.id), { recursive: true })

  const now = new Date().toISOString()
  const project: Project = {
    id: input.id,
    name: input.name,
    prompt: input.prompt,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    metrics: {
      sources: 0,
      documents: 0,
      chunks: 0,
      trainQa: 0,
      evalQa: 0,
      practiceQuestions: 0,
    },
    artifactRoot: `storage/projects/${input.id}`,
    steps: [],
  }

  await writeJson(projectArtifactPath(input.id, "manifest.json"), {
    ...project,
    projectId: project.id,
    domain: "",
    artifactVersion: "0.1.0",
    generatedFiles: ["manifest.json"],
  })

  return project
}

export async function writeProject(project: Project) {
  await writeJson(projectArtifactPath(project.id, "manifest.json"), {
    ...project,
    projectId: project.id,
    domain: project.domainSpec?.domain ?? "",
    artifactVersion: "0.1.0",
  })
}

export async function readProject(projectId: string) {
  await ensureSeedProject()

  try {
    return await readJson<Project>(projectArtifactPath(projectId, "manifest.json"))
  } catch {
    return null
  }
}

export async function updateProject(projectId: string, patch: Partial<Project>) {
  const current = await readProject(projectId)

  if (!current) {
    return null
  }

  const next: Project = {
    ...current,
    ...patch,
    metrics: {
      ...current.metrics,
      ...patch.metrics,
    },
    updatedAt: new Date().toISOString(),
  }

  await writeProject(next)
  return next
}

export async function listProjects() {
  await ensureSeedProject()
  await mkdir(projectsRoot, { recursive: true })

  const entries = await readdir(projectsRoot, { withFileTypes: true })
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readProject(entry.name))
  )

  return projects
    .filter((project): project is Project => Boolean(project))
    .toSorted(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
}

export async function writeArtifactFile(
  projectId: string,
  relativePath: string,
  content: string
) {
  const filePath = safeArtifactPath(projectId, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, "utf8")
}

export async function writeArtifactJson(
  projectId: string,
  relativePath: string,
  value: unknown
) {
  await writeJson(safeArtifactPath(projectId, relativePath), value)
}

export async function appendArtifactJsonl(
  projectId: string,
  relativePath: string,
  records: unknown[]
) {
  if (records.length === 0) {
    return
  }

  const filePath = safeArtifactPath(projectId, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(
    filePath,
    records.map((record) => JSON.stringify(record)).join("\n") + "\n",
    "utf8"
  )
}

export async function writeArtifactJsonl(
  projectId: string,
  relativePath: string,
  records: unknown[]
) {
  await writeArtifactFile(
    projectId,
    relativePath,
    records.map((record) => JSON.stringify(record)).join("\n") +
      (records.length > 0 ? "\n" : "")
  )
}

export async function writeBuildJob(job: BuildJob) {
  await writeArtifactJson(job.projectId, "jobs/latest.json", job)
}

export async function readBuildJob(projectId: string) {
  await ensureSeedProject()

  try {
    return await readJson<BuildJob>(projectArtifactPath(projectId, "jobs", "latest.json"))
  } catch {
    return null
  }
}

export async function appendBuildLog(record: BuildLogRecord) {
  await appendArtifactJsonl(record.projectId, "logs/build_logs.jsonl", [record])
}

export async function readBuildLogs(projectId: string) {
  await ensureSeedProject()
  const content = await readTextIfExists(
    projectArtifactPath(projectId, "logs", "build_logs.jsonl")
  )

  return parseJsonl<BuildLogRecord>(content)
}

export async function appendChatTrace(record: ChatTrace) {
  await appendArtifactJsonl(record.projectId, "logs/chat_traces.jsonl", [record])
}

export async function appendActionTrace(record: ActionTrace) {
  await appendArtifactJsonl(record.projectId, "logs/action_traces.jsonl", [record])
}

export async function appendFeedbackTrace(record: FeedbackTrace) {
  await appendArtifactJsonl(record.projectId, "logs/feedback.jsonl", [record])
}

export async function readArtifactPreview(
  projectId: string,
  relativePath: string,
  maxCharacters = 3000
): Promise<ArtifactPreview> {
  await ensureSeedProject()

  const content = await readTextIfExists(safeArtifactPath(projectId, relativePath))

  return {
    path: relativePath,
    content:
      content.length > maxCharacters
        ? `${content.slice(0, maxCharacters)}\n...`
        : content,
  }
}

export async function readProjectArtifacts(
  projectId: string
): Promise<ProjectArtifacts> {
  await ensureSeedProject()

  const [
    sourceManifest,
    chunksJsonl,
    trainQaJsonl,
    evalQaJsonl,
    practiceQuestions,
    domainSpecPreview,
    sourceManifestPreview,
    chunksPreview,
    trainQaPreview,
    evalQaPreview,
    modelGoalJson,
    sourcePlanJson,
    trainingPlanJson,
    modelGoalPreview,
    sourcePlanPreview,
    trainingPlanPreview,
    actionTasksJsonl,
    actionTasksPreview,
    rewardSpecJson,
    rewardSpecPreview,
    importSummaryJson,
    permissionsJson,
    qualityTagsJson,
    adapterTraceJson,
    importSummaryPreview,
    permissionsPreview,
    qualityTagsPreview,
    adapterTracePreview,
  ] = await Promise.all([
    readTextIfExists(projectArtifactPath(projectId, "source_manifest.json")),
    readTextIfExists(projectArtifactPath(projectId, "chunks.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "train_qa.jsonl")),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "eval_qa.jsonl")),
    readTextIfExists(
      projectArtifactPath(projectId, "datasets", "practice_questions.md")
    ),
    readArtifactPreview(projectId, "domain_spec.json"),
    readArtifactPreview(projectId, "source_manifest.json"),
    readArtifactPreview(projectId, "chunks.jsonl"),
    readArtifactPreview(projectId, "datasets/train_qa.jsonl"),
    readArtifactPreview(projectId, "datasets/eval_qa.jsonl"),
    readTextIfExists(projectArtifactPath(projectId, "model_goal.json")),
    readTextIfExists(projectArtifactPath(projectId, "source_plan.json")),
    readTextIfExists(projectArtifactPath(projectId, "training_plan.json")),
    readArtifactPreview(projectId, "model_goal.json"),
    readArtifactPreview(projectId, "source_plan.json"),
    readArtifactPreview(projectId, "training_plan.json"),
    readTextIfExists(projectArtifactPath(projectId, "datasets", "action_tasks.jsonl")),
    readArtifactPreview(projectId, "datasets/action_tasks.jsonl"),
    readTextIfExists(projectArtifactPath(projectId, "rewards", "reward_spec.json")),
    readArtifactPreview(projectId, "rewards/reward_spec.json"),
    readTextIfExists(projectArtifactPath(projectId, "imports", "import_summary.json")),
    readTextIfExists(projectArtifactPath(projectId, "imports", "permissions.json")),
    readTextIfExists(projectArtifactPath(projectId, "imports", "quality_tags.json")),
    readTextIfExists(projectArtifactPath(projectId, "imports", "adapter_trace.json")),
    readArtifactPreview(projectId, "imports/import_summary.json"),
    readArtifactPreview(projectId, "imports/permissions.json"),
    readArtifactPreview(projectId, "imports/quality_tags.json"),
    readArtifactPreview(projectId, "imports/adapter_trace.json"),
  ])
  const modelGoal = modelGoalJson
    ? (JSON.parse(modelGoalJson) as ModelGoal)
    : undefined
  const sourcePlan = sourcePlanJson
    ? (JSON.parse(sourcePlanJson) as SourcePlan)
    : undefined
  const trainingPlan = trainingPlanJson
    ? (JSON.parse(trainingPlanJson) as TrainingPlan)
    : undefined
  const rewardSpec = rewardSpecJson
    ? (JSON.parse(rewardSpecJson) as RewardSpec)
    : undefined
  const importSummary = importSummaryJson
    ? (JSON.parse(importSummaryJson) as ImportSummary)
    : undefined

  return {
    sources: sourceManifest ? (JSON.parse(sourceManifest) as SourceRecord[]) : [],
    chunks: parseJsonl<ChunkRecord>(chunksJsonl),
    trainQa: parseJsonl<QAPair>(trainQaJsonl),
    evalQa: parseJsonl<QAPair>(evalQaJsonl),
    practiceQuestions,
    domainSpecPreview: domainSpecPreview.content,
    sourceManifestPreview: sourceManifestPreview.content,
    chunksPreview: chunksPreview.content,
    trainQaPreview: trainQaPreview.content,
    evalQaPreview: evalQaPreview.content,
    modelGoal,
    sourcePlan,
    trainingPlan,
    actionTasks: parseJsonl<ActionTask>(actionTasksJsonl),
    rewardSpec,
    importSummary,
    permissions: permissionsJson
      ? (JSON.parse(permissionsJson) as PermissionRecord[])
      : [],
    qualityTags: qualityTagsJson
      ? (JSON.parse(qualityTagsJson) as QualityTagRecord[])
      : [],
    adapterTrace: adapterTraceJson
      ? (JSON.parse(adapterTraceJson) as AdapterTraceRecord[])
      : [],
    modelGoalPreview: modelGoalPreview.content,
    sourcePlanPreview: sourcePlanPreview.content,
    trainingPlanPreview: trainingPlanPreview.content,
    actionTasksPreview: actionTasksPreview.content,
    rewardSpecPreview: rewardSpecPreview.content,
    importSummaryPreview: importSummaryPreview.content,
    permissionsPreview: permissionsPreview.content,
    qualityTagsPreview: qualityTagsPreview.content,
    adapterTracePreview: adapterTracePreview.content,
  }
}
