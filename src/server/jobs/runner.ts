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
import { planProject, type PlannedProject } from "@/server/pipeline/mock-planner"
import type { ActionTask } from "@/types/actions"
import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { BuildJob } from "@/types/jobs"
import type { DomainGraphNode } from "@/types/imports"
import type { BuildStep, Project, ProjectStatus } from "@/types/project"
import type { RewardSpec } from "@/types/rewards"

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
    label: "Ingesting mock documents",
    description: "Generate deterministic seed documents for the inferred domain.",
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
}

function now() {
  return new Date().toISOString()
}

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
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
    const generated = generateBundle(projectId, plan)
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
  await writeArtifactJson(projectId, "domain_graph.json", generated.domainGraph)
  await writeArtifactJson(projectId, "source_manifest.json", generated.sources)
  await writeArtifactJson(projectId, "rewards/reward_spec.json", generated.rewardSpec)
  await writeArtifactJsonl(projectId, "sources.jsonl", generated.sources)
  await writeArtifactJsonl(projectId, "chunks.jsonl", generated.chunks)
  await writeArtifactJsonl(projectId, "datasets/train_qa.jsonl", generated.trainQa)
  await writeArtifactJsonl(projectId, "datasets/eval_qa.jsonl", generated.evalQa)
  await writeArtifactJsonl(projectId, "datasets/action_tasks.jsonl", generated.actionTasks)
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
}

function generateBundle(projectId: string, plan: PlannedProject): GeneratedBundle {
  const documents = makeDocuments(projectId, plan)
  const sources = documents.map((document): SourceRecord => ({
    id: document.sourceId,
    title: document.title,
    url: `seed://${projectId}/${document.id}`,
    provider: "seed",
    domain: "castgenie.local",
    fetchedAt: now(),
    permissionStatus: "user_provided",
    notes: "Synthetic Wave 3 mock data. Replace with public, licensed, or user-provided sources before production training.",
  }))
  const chunks = makeChunks(documents)
  const domainGraph = makeDomainGraph(plan, chunks)
  const trainQa = makeQaPairs(chunks, 18, "train")
  const evalQa = makeQaPairs(chunks.slice().reverse(), 8, "eval")
  const practiceQuestions = chunks
    .slice(0, 12)
    .map((chunk, index) => `${index + 1}. ${chunk.title}: create a source-grounded response with citations.`)
    .join("\n")
  const actionTasks = makeActionTasks(plan, chunks)
  const rewardSpec = makeRewardSpec(projectId, plan)

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
  }
}

function makeDocuments(projectId: string, plan: PlannedProject): DocumentRecord[] {
  const bodies = getDocumentBodies(plan)

  return bodies.map((document, index) => {
    const sourceNumber = String(index + 1).padStart(3, "0")
    const text = `# ${document.title}\n\n${document.body}\n\n## Source note\nSynthetic Wave 3 material for CastGenie prototype; replace with licensed, official, or user-provided sources for production.`

    return {
      id: `doc_${sourceNumber}`,
      sourceId: `source_${sourceNumber}`,
      title: document.title,
      text,
      markdownPath: `documents/${projectId}_${sourceNumber}.md`,
      tokenEstimate: estimateTokens(text),
    }
  })
}

function getDocumentBodies(plan: PlannedProject) {
  if (plan.kind === "owasp_security") {
    return [
      {
        title: "OWASP-oriented code review workflow",
        body: "## Key concepts\nA security model needs evidence from code, framework behavior, and known vulnerability classes.\n\n## Review pattern\nIdentify inputs, trust boundaries, sinks, authentication checks, authorization checks, and output encoding.\n\n## Common mistakes\nDo not claim exploitability without code evidence. Distinguish suspected risk from confirmed vulnerability.",
      },
      {
        title: "Injection and broken access control examples",
        body: "## Key concepts\nInjection appears when untrusted input reaches interpreters without parameterization. Broken access control appears when object-level authorization is missing.\n\n## Fix pattern\nUse parameterized APIs, centralized authorization checks, least privilege, and regression tests.\n\n## Common mistakes\nA route-level login check is not the same as object-level authorization.",
      },
      {
        title: "Secure remediation explanation format",
        body: "## Key concepts\nA useful security assistant should explain risk, affected code path, severity, reproduction preconditions, and concrete fix.\n\n## Output pattern\nSummarize finding, cite code/source context, explain impact, propose patch, and include a test case.\n\n## Common mistakes\nAvoid generic security advice that is not tied to the inspected codebase.",
      },
    ]
  }

  if (plan.kind === "ca_edtech") {
    return [
      {
        title: "CA lesson generation from syllabus nodes",
        body: "## Key concepts\nAn ed-tech model should map lessons to syllabus nodes, concepts, examples, and exam-style outcomes.\n\n## Lesson pattern\nStart with the concept, give a plain explanation, show a worked example, call out a common mistake, and end with practice.\n\n## Common mistakes\nLessons should not drift away from the source syllabus or invent authoritative rules without citations.",
      },
      {
        title: "Question paper and MCQ generation",
        body: "## Key concepts\nQuestion generation should balance marks, difficulty, topic coverage, and answer format.\n\n## Paper pattern\nCreate sections, marks, question type, expected answer outline, and concept tags.\n\n## Common mistakes\nPast-paper-like does not mean copying past papers. Generate similar structure from licensed or user-provided patterns.",
      },
      {
        title: "Answer key and marking scheme generation",
        body: "## Key concepts\nA useful answer key gives final answer, steps, marks allocation, and source-grounded explanation.\n\n## Marking pattern\nAllocate marks to concept identification, calculation setup, journal-entry logic, and final conclusion.\n\n## Common mistakes\nDo not omit the reasoning steps that a learner needs to self-correct.",
      },
    ]
  }

  return [
    {
      title: "Custom expert model source grounding",
      body: "## Key concepts\nA domain model should answer from provided material, expose its uncertainty, and cite relevant source chunks.\n\n## Workflow\nPlan the domain, ingest source material, chunk the corpus, generate train and eval rows, then expose useful actions.\n\n## Common mistakes\nDo not treat a vague prompt as permission to invent unsupported facts.",
    },
    {
      title: "Custom domain action generation",
      body: "## Key concepts\nActions should reflect the user's intended workflow rather than generic chat only.\n\n## Workflow\nDerive action templates from the target user, capability list, and source material.\n\n## Common mistakes\nDo not hardcode CA-specific actions into unrelated domains.",
    },
  ]
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

function makeDomainGraph(plan: PlannedProject, chunks: ChunkRecord[]): DomainGraphNode[] {
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
    ...chunks.slice(0, 6).map((chunk): DomainGraphNode => ({
      id: `topic-${chunk.id}`,
      kind: "topic",
      title: chunk.title,
      parentId: "domain-root",
      tags: chunk.keywords,
    })),
  ]
}

function makeQaPairs(chunks: ChunkRecord[], count: number, type: QAPair["type"]) {
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
