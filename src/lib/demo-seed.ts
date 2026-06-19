import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { ARTIFACT_VERSION, DEMO_PROJECT_ID } from "@/lib/constants"
import { projectArtifactPath, projectRoot } from "@/lib/paths"
import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type { DomainSpec } from "@/types/domain"
import type { BuildStep, Project } from "@/types/project"

const createdAt = "2026-06-19T00:00:00.000Z"
const prompt =
  "Build me an expert assistant for CA Final Advanced Accounting in India. It should explain consolidation concepts, solve journal-entry style problems step-by-step, generate practice questions, and cite the source material."

type SeedDoc = {
  slug: string
  title: string
  topic: string
  body: string
}

const seedDocs: SeedDoc[] = [
  {
    slug: "source_001",
    title: "Introduction to company accounts and financial statements",
    topic: "Company accounts",
    body: `# Introduction to company accounts and financial statements

## Scope note
This synthetic note introduces company accounts for a CA Final Advanced Accounting study assistant. It is not a substitute for official material.

## Key concepts
Company accounts organize equity, reserves, assets, liabilities, income, and expenses into financial statements. A student should identify the statement affected before choosing an accounting treatment.

## Step-by-step explanation
Start with the transaction. Identify recognition, measurement, presentation, and disclosure. Then connect the treatment to the balance sheet, statement of profit and loss, and notes.

## Mini example
If a company issues shares at a premium, share capital records face value and securities premium records the excess. The presentation separates legal capital from reserve movement.

## Common mistakes
Students often mix capital reserves with revenue reserves, ignore presentation, or solve entries without naming the financial statement impact.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
  {
    slug: "source_002",
    title: "Consolidated financial statements basics",
    topic: "Consolidation basics",
    body: `# Consolidated financial statements basics

## Scope note
This synthetic note explains consolidation logic for an educational prototype focused on CA Final Advanced Accounting.

## Key concepts
Consolidation presents the parent and subsidiary as one economic entity. The process eliminates the parent's investment against the subsidiary's equity and combines assets, liabilities, income, and expenses.

## Step-by-step explanation
First confirm control. Next align reporting dates and accounting policies. Then combine like items, eliminate investment against equity, compute goodwill or capital reserve, recognize non-controlling interest, and remove intra-group balances.

## Mini example
If Parent Ltd owns 80 percent of Subsidiary Ltd, the group includes 100 percent of subsidiary assets and liabilities. The 20 percent not owned is shown as non-controlling interest.

## Common mistakes
Common errors include consolidating only the parent share of assets, missing intra-group receivables and payables, and treating all reserves as post-acquisition reserves.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
  {
    slug: "source_003",
    title: "Goodwill and capital reserve in acquisition accounting",
    topic: "Goodwill",
    body: `# Goodwill and capital reserve in acquisition accounting

## Scope note
This synthetic note covers the acquisition-date comparison used in consolidation study problems.

## Key concepts
Goodwill arises when consideration plus non-controlling interest exceeds the parent's share of identifiable net assets at acquisition. Capital reserve arises when the net asset share exceeds the acquisition-date cost measure.

## Step-by-step explanation
List consideration transferred. Add the relevant non-controlling interest measure. Compare that total with fair value of identifiable net assets acquired. A positive excess is goodwill; a negative excess is capital reserve.

## Mini example
If consideration is 900, NCI is 200, and identifiable net assets are 1,000, goodwill is 100. The calculation is 900 plus 200 minus 1,000.

## Common mistakes
Students often use closing net assets instead of acquisition-date net assets, ignore fair value adjustments, or mix proportionate and fair value NCI methods.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
  {
    slug: "source_004",
    title: "Non-controlling interest and pre-acquisition profits",
    topic: "NCI and pre-acquisition profits",
    body: `# Non-controlling interest and pre-acquisition profits

## Scope note
This synthetic note focuses on ownership split and reserve classification in consolidation problems.

## Key concepts
Pre-acquisition profits exist before control is obtained and form part of the acquisition-date net assets. Post-acquisition profits arise after control and are split between the parent and non-controlling interest.

## Step-by-step explanation
Determine the acquisition date. Split reserves into pre-acquisition and post-acquisition portions. Use pre-acquisition reserves in the net assets comparison. Allocate post-acquisition movement between group retained earnings and NCI.

## Mini example
If reserves are 500 at reporting date and 300 existed at acquisition, 300 is pre-acquisition and 200 is post-acquisition. With 80 percent ownership, 160 of post-acquisition reserves belongs to the group and 40 belongs to NCI.

## Common mistakes
Students frequently allocate pre-acquisition profits to group retained earnings, forget NCI's post-acquisition share, or ignore changes between acquisition and reporting dates.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
  {
    slug: "source_005",
    title: "Internal transactions and unrealized profit adjustments",
    topic: "Internal transactions",
    body: `# Internal transactions and unrealized profit adjustments

## Scope note
This synthetic note explains intra-group eliminations for an educational accounting prototype.

## Key concepts
Intra-group sales, purchases, receivables, payables, interest, and dividends do not represent transactions with outsiders. Unrealized profit in closing inventory must be removed from group profit and inventory.

## Step-by-step explanation
Identify the internal transaction. Eliminate matching income and expense or receivable and payable balances. If inventory remains in the group, compute unrealized profit and reduce inventory plus the seller's profit.

## Mini example
If Parent sells goods to Subsidiary for 120 at a 20 percent profit on selling price and half remains unsold, unrealized profit is 12. The group reduces inventory and profit by 12.

## Common mistakes
Students calculate profit on cost when the question says profit on selling price, eliminate only one side of a receivable/payable pair, or adjust the buyer instead of the seller for profit impact.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
  {
    slug: "source_006",
    title: "Exam-style journal-entry problem patterns",
    topic: "Journal-entry reasoning",
    body: `# Exam-style journal-entry problem patterns

## Scope note
This synthetic note supports step-by-step journal-entry reasoning for CA Final-style practice.

## Key concepts
A journal-entry problem usually tests account identification, debit-credit direction, amount computation, and explanation. Consolidation entries are adjustment entries, not ordinary books of account entries.

## Step-by-step explanation
Read the adjustment sentence. Name the accounts affected. Decide whether group profit, inventory, investment, equity, NCI, or receivables/payables must change. Compute the amount and then write the debit and credit.

## Mini example
For unrealized profit in closing stock, debit group profit or seller retained earnings and credit inventory. The entry removes profit that has not been realized outside the group.

## Common mistakes
Students memorize entries without identifying the affected statement, reverse debit and credit directions, or omit narration that explains why the adjustment exists.

## Source note
Synthetic demo material for product prototype; replace with licensed/official sources for production.`,
  },
]

export const seedDomainSpec: DomainSpec = {
  id: "domain_ca_final_advanced_accounting",
  title: "CA Final Advanced Accounting Assistant",
  domain: "CA Final Advanced Accounting",
  region: "India",
  targetUser: "CA Final candidate preparing for Advanced Accounting",
  level: "advanced",
  assistantBehaviors: [
    "Explain concepts in exam-oriented language",
    "Solve journal-entry style problems step-by-step",
    "Generate practice questions",
    "Cite source chunks from the generated corpus",
  ],
  artifactTypes: [
    "rag_corpus",
    "source_manifest",
    "practice_questions",
    "train_qa",
    "eval_qa",
    "castform_project",
  ],
  sourcePolicy: {
    allowedDomains: ["castgenie.local"],
    blockedDomains: [],
    requireCitations: true,
    allowUserProvidedDocs: true,
    permissionNote:
      "Seed material is synthetic demo content. Replace with official, licensed, or user-provided material before production training.",
  },
  safetyPolicy: {
    riskLevel: "medium",
    disallowedAdvice: [
      "Do not present the assistant as a professional accounting opinion.",
      "Do not cite unknown or unlicensed material as official guidance.",
    ],
    requiredDisclaimer:
      "Educational study assistant only. Verify exam and accounting guidance against official ICAI material.",
  },
  outputStyle: {
    tone: "clear, rigorous, exam-oriented",
    answerStructure: [
      "Direct answer",
      "Step-by-step explanation",
      "Example",
      "Common mistake",
      "Practice question",
      "Sources",
    ],
    citationStyle: "source-list",
  },
}

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

function makeSources(): SourceRecord[] {
  return seedDocs.map((doc, index) => ({
    id: `source_${String(index + 1).padStart(3, "0")}`,
    title: doc.title,
    url: `seed://ca-advanced-accounting/${doc.slug}`,
    provider: "seed",
    domain: "castgenie.local",
    fetchedAt: createdAt,
    permissionStatus: "user_provided",
    notes:
      "Synthetic demo material for product prototype; replace with licensed/official sources for production.",
  }))
}

function makeDocuments(): DocumentRecord[] {
  return seedDocs.map((doc, index) => ({
    id: `doc_${String(index + 1).padStart(3, "0")}`,
    sourceId: `source_${String(index + 1).padStart(3, "0")}`,
    title: doc.title,
    text: doc.body,
    markdownPath: `documents/${doc.slug}.md`,
    tokenEstimate: estimateTokens(doc.body),
  }))
}

function makeChunks(documents: DocumentRecord[]): ChunkRecord[] {
  const chunks: ChunkRecord[] = []

  for (const document of documents) {
    const sections = document.text
      .split(/\n(?=## )/)
      .filter((section) => section.startsWith("## "))

    for (const section of sections) {
      const heading = section.split("\n")[0].replace(/^## /, "")
      const charStart = document.text.indexOf(section)
      const chunkNumber = chunks.length + 1
      chunks.push({
        id: `chunk_${String(chunkNumber).padStart(3, "0")}`,
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

function makeQaPairs(chunks: ChunkRecord[], count: number, type: QAPair["type"]) {
  const stems = [
    "Explain the main idea in this source chunk",
    "Create a step-by-step answer for this topic",
    "Write an exam-style answer using the cited source",
    "Identify a common mistake related to this topic",
    "Frame a journal-entry reasoning response for this topic",
  ]

  return Array.from({ length: count }, (_, index): QAPair => {
    const chunk = chunks[index % chunks.length]
    const difficulty: QAPair["difficulty"] =
      index % 5 === 0 ? "hard" : index % 2 === 0 ? "medium" : "easy"
    return {
      id: `${type}_${String(index + 1).padStart(3, "0")}`,
      type,
      topic: chunk.title.split(" - ")[1] ?? chunk.title,
      question: `${stems[index % stems.length]}: ${chunk.title}.`,
      expectedAnswer: `Use the workspace source titled "${chunk.title}" to answer with a direct explanation, step-by-step reasoning, a short example, and a source citation.`,
      sourceIds: [chunk.sourceId],
      chunkIds: [chunk.id],
      difficulty,
    }
  })
}

function makePracticeQuestions(chunks: ChunkRecord[]) {
  return chunks
    .slice(0, 30)
    .map((chunk, index) => {
      const number = index + 1
      return `${number}. ${chunk.title}: explain the treatment, show the reasoning steps, and cite the relevant source chunk.`
    })
    .join("\n")
}

function makeFlashcards(chunks: ChunkRecord[]) {
  return chunks
    .slice(0, 12)
    .map((chunk, index) => {
      const number = index + 1
      return `## Flashcard ${number}\n\nFront: What should you remember about ${chunk.title}?\n\nBack: ${chunk.text
        .replace(/\s+/g, " ")
        .slice(0, 180)}...`
    })
    .join("\n\n")
}

function toJsonl(records: unknown[]) {
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n"
}

function makeBuildSteps(): BuildStep[] {
  return [
    {
      id: "planning",
      label: "Planning",
      description: "Generated the CA Advanced Accounting domain spec.",
      status: "complete",
      startedAt: createdAt,
      finishedAt: createdAt,
    },
    {
      id: "discovering_sources",
      label: "Discovering sources",
      description: "Loaded deterministic synthetic seed sources.",
      status: "complete",
      startedAt: createdAt,
      finishedAt: createdAt,
    },
    {
      id: "extracting_documents",
      label: "Extracting documents",
      description: "Wrote seed markdown documents to local storage.",
      status: "complete",
      startedAt: createdAt,
      finishedAt: createdAt,
    },
    {
      id: "chunking",
      label: "Chunking",
      description: "Split seed documents into source-grounded chunks.",
      status: "complete",
      startedAt: createdAt,
      finishedAt: createdAt,
    },
    {
      id: "generating_datasets",
      label: "Generating datasets",
      description: "Generated train, eval, and practice-question files.",
      status: "complete",
      startedAt: createdAt,
      finishedAt: createdAt,
    },
  ]
}

async function pathExists(filePath: string) {
  try {
    await readFile(filePath)
    return true
  } catch {
    return false
  }
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

export async function ensureSeedProject() {
  const requiredFiles = [
    "manifest.json",
    "domain_spec.json",
    "source_manifest.json",
    "sources.jsonl",
    "chunks.jsonl",
    "datasets/train_qa.jsonl",
    "datasets/eval_qa.jsonl",
    "datasets/practice_questions.md",
  ]
  const requiredFilesExist = await Promise.all(
    requiredFiles.map((filePath) =>
      pathExists(projectArtifactPath(DEMO_PROJECT_ID, filePath))
    )
  )

  if (requiredFilesExist.every(Boolean)) {
    return
  }

  const root = projectRoot(DEMO_PROJECT_ID)
  const documentsDir = path.join(root, "documents")
  const datasetsDir = path.join(root, "datasets")
  const logsDir = path.join(root, "logs")

  await mkdir(documentsDir, { recursive: true })
  await mkdir(datasetsDir, { recursive: true })
  await mkdir(logsDir, { recursive: true })

  const sources = makeSources()
  const documents = makeDocuments()
  const chunks = makeChunks(documents)
  const trainQa = makeQaPairs(chunks, 48, "train")
  const evalQa = makeQaPairs(chunks.slice().reverse(), 15, "eval")
  const practiceQuestions = makePracticeQuestions(chunks)
  const flashcards = makeFlashcards(chunks)
  const generatedFiles = [
    "manifest.json",
    "domain_spec.json",
    "source_manifest.json",
    "sources.jsonl",
    ...documents.map((document) => document.markdownPath),
    "chunks.jsonl",
    "datasets/train_qa.jsonl",
    "datasets/eval_qa.jsonl",
    "datasets/practice_questions.md",
    "datasets/flashcards.md",
    "logs/build_logs.jsonl",
  ]

  const metrics: Project["metrics"] = {
    sources: sources.length,
    documents: documents.length,
    chunks: chunks.length,
    trainQa: trainQa.length,
    evalQa: evalQa.length,
    practiceQuestions: practiceQuestions.split("\n").filter(Boolean).length,
  }

  const project: Project & {
    projectId: string
    domain: string
    artifactVersion: string
    generatedFiles: string[]
  } = {
    projectId: DEMO_PROJECT_ID,
    id: DEMO_PROJECT_ID,
    name: "CA Advanced Accounting workspace",
    prompt,
    status: "ready",
    createdAt,
    updatedAt: createdAt,
    domain: seedDomainSpec.domain,
    artifactVersion: ARTIFACT_VERSION,
    domainSpec: seedDomainSpec,
    metrics,
    artifactRoot: `storage/projects/${DEMO_PROJECT_ID}`,
    generatedFiles,
    steps: makeBuildSteps(),
  }

  await writeJson(path.join(root, "domain_spec.json"), seedDomainSpec)
  await writeJson(path.join(root, "source_manifest.json"), sources)
  await writeFile(path.join(root, "sources.jsonl"), toJsonl(sources), "utf8")
  await writeFile(path.join(root, "chunks.jsonl"), toJsonl(chunks), "utf8")
  await writeFile(path.join(datasetsDir, "train_qa.jsonl"), toJsonl(trainQa), "utf8")
  await writeFile(path.join(datasetsDir, "eval_qa.jsonl"), toJsonl(evalQa), "utf8")
  await writeFile(
    path.join(datasetsDir, "practice_questions.md"),
    `# Practice Questions\n\n${practiceQuestions}\n`,
    "utf8"
  )
  await writeFile(path.join(datasetsDir, "flashcards.md"), `${flashcards}\n`, "utf8")
  await writeFile(
    path.join(logsDir, "build_logs.jsonl"),
    toJsonl(
      project.steps.map((step) => ({
        timestamp: createdAt,
        stepId: step.id,
        status: step.status,
        message: step.description,
      }))
    ),
    "utf8"
  )

  await Promise.all(
    documents.map((document) =>
      writeFile(path.join(root, document.markdownPath), document.text, "utf8")
    )
  )

  await writeJson(path.join(root, "manifest.json"), project)
}
