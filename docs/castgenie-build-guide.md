# CastGenie for Castform — Codex Build Guide

## One-line thesis

Build a shadcn-native Next.js product that lets a non-technical user describe the expert model or domain product they want in plain English, while the backend automatically plans sources, ingests/segments data, creates RAG and training artifacts, runs evals/reward shaping, launches Castform training/hosting when configured, and exposes the resulting model through a usable assistant and task actions.

## Hiring-demo positioning

This is not a fake “train a foundation model instantly” demo. It is an honest product layer around Castform:

> English prompt → domain/product plan → source ingestion → cleaned corpus → RAG assistant → datasets/evals/rewards → Castform training/hosting → user-facing assistant/actions.

The point to show Castform:

> Castform can become accessible to anyone who knows English. Users should not need to understand RAG, chunks, embeddings, rewards, traces, queues, or training pipelines. They describe the model behavior they want, and the backend creates and operates the technical training workspace behind the scenes.

This can also be positioned as a partner surface:

- Castform handles post-training, reward/eval workflows, and specialized-model improvement.
- Exa handles source discovery and LLM-ready web search.
- Firecrawl or equivalent extraction tooling handles page scraping/crawling when raw source extraction is needed.
- Upload/import adapters handle user-provided or licensed corpora, past papers, PDFs, codebases, docs, and domain datasets.
- The product UI hides this behind an “English → trained domain model” flow.

## Target product behavior

The user should be able to describe an outcome, not a pipeline.

Example ed-tech behavior:

```text
I want to build a CA ed-tech platform. I need a model that can explain lessons,
generate descriptions, create MCQs, produce practice papers, simplify concepts,
and generate answer keys for subjects like Advanced Accounting and Direct Tax.
```

CastGenie should infer that this needs curriculum mapping, source ingestion, past-paper-style question modeling, lesson-grounded explanation data, eval datasets, and user-facing actions such as:

```text
Generate an Advanced Accounting question paper
Generate Direct Tax MCQs
Create a simplified lesson on consolidation
Create an answer key with marking scheme
Generate weak-topic practice questions
```

This must remain domain-agnostic. The same system should work for other real training requests, such as:

```text
Train a model that reviews codebases for OWASP security bugs and explains fixes.
```

In that case the backend should infer source types like OWASP docs, secure-code examples, vulnerable/fixed code pairs, static-analysis findings, eval repos, and actions like “scan this codebase” or “explain this vulnerability.”

## Default demo vertical

Use this as the default seeded demo:

```text
Build me an expert assistant for CA Final Advanced Accounting in India.
It should explain concepts, generate practice questions, solve journal-entry style problems step-by-step, and cite its source material.
```

Why this vertical:

- Serious domain.
- India-specific.
- Structured enough for question/eval generation.
- Safer than medical diagnosis.
- Commercially believable.
- Good fit for RAG + practice-question generation.

Allowed alternate demos:

```text
Build an Indian GST basics assistant for small business owners. It should explain filing, input tax credit, invoices, common mistakes, and cite sources.
```

```text
Build an educational MBBS cardiology study assistant. It should explain anatomy, cardiac cycle, ECG basics, and exam questions. It must not provide diagnosis, treatment, dosage, or patient-specific medical advice.
```

For the initial demo, prefer CA Advanced Accounting or GST. Avoid medical unless strict educational guardrails are implemented.

## Non-negotiable product truth

Use this language everywhere:

```text
Working domain assistant
Castform-ready training artifacts
RAG now, training later
```

Avoid this language:

```text
Instant custom foundation model
Fully trained model from random internet data
Medical/legal/financial professional replacement
```

## Final demo story

The 90-second demo should show:

1. User enters an English prompt.
2. The app converts it into a structured domain spec.
3. The app finds or loads relevant source material.
4. The app cleans and chunks the corpus.
5. The app generates QA/eval/practice-question files.
6. The app opens a working domain assistant.
7. The assistant answers with citations from the generated corpus.
8. The app shows prebuilt domain actions, such as generating papers, MCQs, lessons, or audits.
9. The app exports or launches a Castform training/hosting run.
10. Once a Castform model is available, the assistant/actions call the hosted model with RAG context.

## Product name options

Use one of these:

- CastGenie
- Castform CastGenie
- English-to-Castform
- English-to-Trained Model
- Model Training Workspace Builder

Recommended UI name for the demo:

```text
CastGenie
```

Subheadline:

```text
Turn plain-English domain intent into a working RAG assistant and Castform-ready training workspace.
```

Updated product subheadline:

```text
Describe the model you need. CastGenie builds the corpus, datasets, evals, rewards, Castform training run, and user-facing assistant behind the scenes.
```

## Source docs to follow

Keep these as implementation references:

- Castform RAG training docs: https://castform.com/docs/rag/guide/
- Castform trace training overview: https://castform.com/docs/traces/overview/
- Castform trace processing/filtering: https://castform.com/docs/traces/processing/
- Castform RL diversity / reward clustering note: https://castform.com/blog/rl-diversity/
- Exa Search API: https://exa.ai/docs/reference/search
- Exa Contents API: https://exa.ai/docs/reference/contents-api-guide
- Firecrawl Scrape API: https://docs.firecrawl.dev/api-reference/endpoint/scrape
- shadcn Next.js install: https://ui.shadcn.com/docs/installation/next
- shadcn CLI: https://ui.shadcn.com/docs/cli
- shadcn components: https://ui.shadcn.com/docs/components
- shadcn Empty component: https://ui.shadcn.com/docs/components/empty
- lucide icons: https://lucide.dev/icons
- Radix primitives: https://www.radix-ui.com/primitives

## Design-system requirements

Build a new responsive Next.js website using shadcn/ui as the native design system.

Requirements:

- Use Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui components.
- Initialize shadcn with the latest CLI and use owned component source under `src/components/ui`.
- Use Radix-based shadcn primitives, not random component kits.
- Use semantic tokens from `globals.css` and `components.json`; do not hardcode colors repeatedly.
- Use shadcn `Button`, `Card`, `Input`, `Label`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Alert`, `Separator`, `Skeleton`, `Tabs`, `Dialog`, `Sheet`, `Table`, `Tooltip`, `Popover`, and `Empty` where appropriate.
- Use lucide-react icons.
- Build a clean, production-grade UI with strong spacing, restrained typography, and consistent cards/forms/navigation.
- Make every page fully responsive at 320px, 390px, tablet, laptop, and desktop widths.
- Avoid nested cards, cramped forms, giant hero cards, clipped text, horizontal overflow, and decorative gradient blobs.
- Prefer shadcn layout rhythm: clear page headers, content sections, filter/action rows, readable cards, and mobile Sheet navigation.
- Keep implementation accessible: labels, keyboard support, focus states, ARIA where needed.
- Do not create a marketing placeholder. Build the actual usable website screens.

Design direction:

- Minimal, premium, calm SaaS/product UI.
- Soft neutral background, clean surfaces, strong contrast, subtle borders.
- Primary accent should feel warm gold/green, but all colors must be mapped into theme tokens.
- Cards should have generous padding, consistent radius, and clear content hierarchy.
- Forms should have breathing room between labels, inputs, descriptions, and actions.

Before finishing:

- Run lint/typecheck/tests if available.
- Run production build.
- Browser-check desktop, tablet, 390px, and 320px.
- Confirm no horizontal overflow, no clipped titles, no cramped cards, and no console errors.

## Tech stack

Use this stack for the demo:

```text
Frontend: Next.js App Router + TypeScript
Design: Tailwind CSS + shadcn/ui + Radix + lucide-react
Backend: Next.js route handlers and server actions where practical
Storage: Local filesystem for Wave 2 demo artifacts; object/file storage for uploaded PDFs, corpora, and exports later
Database: Local JSON for Wave 2 only; Postgres preferred from Wave 3 onward if a DB server is available
Queue: Job abstraction from Wave 3; in-process runner acceptable for demo, external worker/queue later
RAG retrieval: Local JSONL chunks + simple keyword/BM25-style retrieval first
LLM provider: Adapter interface; mock by default; Gemini/OpenAI/Anthropic optional through env
Search: Exa adapter; mock/seed adapter if no API key
Scrape: Firecrawl adapter; mock/seed adapter if no API key
Imports: user upload, local folder import, Wire Neurons-style JSON import, codebase import later
Castform: Export project artifacts first; training/hosting launcher and model endpoint linkage later
Deployment: Vercel-compatible UI; filesystem demo can run locally
```

Critical build decision:

> The project must work in `MOCK_MODE=true` without Exa, Firecrawl, Castform, or LLM keys.

This makes the demo reliable. Real API integrations are added behind adapters.

## Backend automation principle

CastGenie should not ask the user to manually choose RAG, chunking, eval generation, reward functions, or training schemas. The backend owns those decisions:

1. Interpret the English intent into a `ModelGoal`.
2. Produce a source and permission plan.
3. Ingest user-provided, licensed, public, or mock data.
4. Normalize data into a domain graph, documents, chunks, tasks, train rows, eval rows, and reward specs.
5. Run local RAG immediately.
6. Launch Castform training/hosting when configured.
7. Connect the resulting hosted model to chat and prebuilt product actions.

The UI should expose progress, artifacts, eval results, model versions, and domain actions; it should not expose backend complexity as required user work.

## Wire Neurons reference data

The local Wire Neurons project is a useful reference for CA-specific ingestion patterns:

```text
/Users/hariharan/Documents/projects/wire-neurons/scripts/output
/Users/hariharan/Documents/projects/wire-neurons/scripts/quality/quality-sample-pack.json
/Users/hariharan/Documents/projects/wire-neurons/lib/inter-syllabus.ts
/Users/hariharan/Documents/projects/wire-neurons/lib/final-syllabus.ts
```

Observed useful shapes:

- Syllabus graph: exam, papers, chapters, chapter ids, PDF URLs, unit numbers.
- Enriched chapter profiles: topics, sub-topics, key concepts, methods/formulae, ICAI treatment.
- Paper extraction JSON: attempt, subject, paper number, source URL, question text, marks, type, concepts, answer format, answer summary.
- Quality sample pack: node ids tagged as high-risk, formula-heavy, tax, audit, law-heavy, procedural, broad, IFRS.

Do not blindly copy all Wire Neurons data into CastGenie. Use it as an optional importer/reference adapter. Real production behavior must track source permissions and support arbitrary domains, not hard-code CA as the product.

## Castform RL diversity learning

The Castform RL diversity article matters when CastGenie starts generating multiple candidate questions, lessons, traces, or solutions per objective.

Do not rely on temperature alone; it changes sampling, not what the model learns. Be careful with plain entropy bonuses; they can be gamed by longer or noisy outputs. Prefer a validity-first diversity strategy:

1. Generate multiple candidates per learning objective or task.
2. Score candidates for validity first: grounded, format-correct, syllabus/task aligned, non-duplicative enough, safe.
3. Cluster semantically similar valid outputs.
4. Divide reward among candidates in the same valid cluster so one repeated pattern does not dominate.
5. Give invalid candidates zero reward, not diversity credit.

This belongs in eval/reward waves, especially question generation, lesson generation, code-audit task generation, and trace training.

## Repository setup commands

Use `pnpm` unless the environment requires another package manager.

```bash
pnpm create next-app@latest castgenie \
  --ts \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd castgenie

pnpm dlx shadcn@latest init --base radix

pnpm dlx shadcn@latest add \
  button card input label textarea select checkbox badge alert separator skeleton tabs dialog sheet table tooltip popover empty

pnpm add lucide-react zod date-fns nanoid clsx tailwind-merge

pnpm add -D vitest @testing-library/react @testing-library/jest-dom playwright
```

If shadcn CLI prompts for style/base/color, choose:

```text
Base: radix
Style: default or new default available in CLI
Base color: neutral/zinc-like neutral
CSS variables: yes
Components path: src/components/ui
Utils path: src/lib/utils.ts
```

## Environment variables

Create `.env.example`:

```env
# Core
MOCK_MODE=true
APP_URL=http://localhost:3000

# LLM provider, optional for Wave 1-5
LLM_PROVIDER=mock
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Persistence, optional until Wave 3
DATABASE_URL=
OBJECT_STORAGE_BUCKET=
LOCAL_IMPORT_ROOT=
WIRE_NEURONS_IMPORT_ROOT=/Users/hariharan/Documents/projects/wire-neurons/scripts/output

# Search / scrape providers, optional until Wave 8
EXA_API_KEY=
FIRECRAWL_API_KEY=

# Castform, optional until Wave 9
CASTFORM_API_KEY=
CASTFORM_BASE_URL=

# Demo limits
MAX_SOURCES=12
MAX_PAGES=20
MAX_CHUNKS=300
MAX_QA_PAIRS=60
MAX_EVAL_PAIRS=20
MAX_ACTION_TASKS=30
```

Never commit real API keys.

## Target file structure

Create this structure over waves:

```text
castgenie/
  src/
    app/
      globals.css
      layout.tsx
      page.tsx
      projects/
        new/
          page.tsx
        [projectId]/
          page.tsx
          assistant/
            page.tsx
          artifacts/
            page.tsx
      api/
        projects/
          route.ts
          [projectId]/
            route.ts
            build/
              route.ts
            chat/
              route.ts
            export/
              route.ts
    components/
      app/
        app-sidebar.tsx
        mobile-nav.tsx
        page-shell.tsx
        page-header.tsx
        status-badge.tsx
      projects/
        new-project-form.tsx
        domain-spec-card.tsx
        build-stepper.tsx
        source-table.tsx
        artifact-grid.tsx
        dataset-preview.tsx
        corpus-preview.tsx
        assistant-chat.tsx
        export-panel.tsx
        eval-panel.tsx
      ui/
        ...shadcn owned components
    lib/
      constants.ts
      demo-seed.ts
      paths.ts
      storage.ts
      validators.ts
      retrieval.ts
      chunking.ts
      dataset-generation.ts
      castform-export.ts
      action-generation.ts
      reward-generation.ts
      utils.ts
    server/
      jobs/
        runner.ts
        steps.ts
      pipeline/
        run-build.ts
        steps.ts
      imports/
        adapters.ts
        wire-neurons.ts
        local-folder.ts
        codebase.ts
      providers/
        llm.ts
        llm.mock.ts
        llm.gemini.ts
        exa.ts
        exa.mock.ts
        firecrawl.ts
        firecrawl.mock.ts
        castform.ts
        castform.mock.ts
    types/
      domain.ts
      project.ts
      artifacts.ts
      model-goal.ts
      imports.ts
      jobs.ts
      actions.ts
      rewards.ts
  storage/
    .gitkeep
  public/
  README.md
  .env.example
```

## Core data contracts

Create `src/types/domain.ts`:

```ts
export type DomainRiskLevel = "low" | "medium" | "high";

export type DomainSpec = {
  id: string;
  title: string;
  domain: string;
  region?: string;
  targetUser: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  assistantBehaviors: string[];
  artifactTypes: ArtifactType[];
  sourcePolicy: {
    allowedDomains: string[];
    blockedDomains: string[];
    requireCitations: boolean;
    allowUserProvidedDocs: boolean;
    permissionNote: string;
  };
  safetyPolicy: {
    riskLevel: DomainRiskLevel;
    disallowedAdvice: string[];
    requiredDisclaimer?: string;
  };
  outputStyle: {
    tone: string;
    answerStructure: string[];
    citationStyle: "inline" | "footnote" | "source-list";
  };
};

export type ArtifactType =
  | "rag_corpus"
  | "source_manifest"
  | "practice_questions"
  | "train_qa"
  | "eval_qa"
  | "castform_project"
  | "demo_chat_transcript";
```

Create `src/types/project.ts`:

```ts
export type ProjectStatus =
  | "draft"
  | "queued"
  | "planning"
  | "planning_sources"
  | "importing_sources"
  | "discovering_sources"
  | "extracting_documents"
  | "normalizing_domain"
  | "cleaning_corpus"
  | "chunking"
  | "indexing"
  | "generating_datasets"
  | "generating_actions"
  | "generating_rewards"
  | "exporting_castform"
  | "training_castform"
  | "model_ready"
  | "ready"
  | "failed";

export type BuildStepStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export type BuildStep = {
  id: string;
  label: string;
  description: string;
  status: BuildStepStatus;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
};

export type Project = {
  id: string;
  name: string;
  prompt: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  domainSpec?: DomainSpec;
  metrics: {
    sources: number;
    documents: number;
    chunks: number;
    trainQa: number;
    evalQa: number;
    practiceQuestions: number;
  };
  artifactRoot: string;
  steps: BuildStep[];
};
```

Create `src/types/artifacts.ts`:

```ts
export type SourceRecord = {
  id: string;
  title: string;
  url: string;
  provider:
    | "seed"
    | "exa"
    | "firecrawl"
    | "user_upload"
    | "wire_neurons"
    | "local_folder"
    | "codebase";
  domain: string;
  fetchedAt: string;
  permissionStatus: "unknown" | "allowed_public" | "user_provided" | "licensed" | "blocked";
  notes?: string;
};

export type DocumentRecord = {
  id: string;
  sourceId: string;
  title: string;
  text: string;
  markdownPath: string;
  tokenEstimate: number;
};

export type ChunkRecord = {
  id: string;
  documentId: string;
  sourceId: string;
  title: string;
  text: string;
  charStart: number;
  charEnd: number;
  keywords: string[];
};

export type QAPair = {
  id: string;
  type: "train" | "eval" | "practice";
  topic: string;
  question: string;
  expectedAnswer: string;
  sourceIds: string[];
  chunkIds: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type ChatCitation = {
  sourceId: string;
  chunkId: string;
  title: string;
  url?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  createdAt: string;
};
```

Add these expanded contracts from Wave 3 onward.

Create `src/types/model-goal.ts`:

```ts
export type ModelCapability =
  | "chat"
  | "lesson_generation"
  | "question_generation"
  | "mcq_generation"
  | "answer_key_generation"
  | "paper_generation"
  | "code_review"
  | "security_audit"
  | "explanation"
  | "classification";

export type ModelGoal = {
  id: string;
  domain: string;
  targetUser: string;
  userIntent: string;
  capabilities: ModelCapability[];
  domainExamples: string[];
  riskLevel: DomainRiskLevel;
  successCriteria: string[];
  generatedActions: ActionTemplate[];
};
```

Create `src/types/imports.ts`:

```ts
export type ImportSourceKind =
  | "synthetic_seed"
  | "wire_neurons_json"
  | "local_folder"
  | "uploaded_file"
  | "web_search"
  | "web_scrape"
  | "codebase";

export type PermissionRecord = {
  sourceId: string;
  status: "unknown" | "public_allowed" | "user_provided" | "licensed" | "blocked";
  note: string;
};

export type DomainGraphNode = {
  id: string;
  kind: "exam" | "paper" | "chapter" | "topic" | "task" | "code_area";
  title: string;
  parentId?: string;
  tags: string[];
  metadata?: Record<string, string | number | boolean>;
};

export type ImportedDomainBundle = {
  sources: SourceRecord[];
  documents: DocumentRecord[];
  domainGraph: DomainGraphNode[];
  questions: QAPair[];
  permissions: PermissionRecord[];
  qualityTags: Array<{ nodeId: string; tags: string[] }>;
};
```

Create `src/types/actions.ts`:

```ts
export type ActionTemplate = {
  id: string;
  label: string;
  description: string;
  capability: ModelCapability;
  inputSchema: Record<string, unknown>;
  outputFormat: "lesson" | "mcq_set" | "question_paper" | "answer_key" | "audit_report" | "chat_answer";
  retrievalPolicy: {
    requiredTags?: string[];
    maxChunks: number;
    requireCitations: boolean;
  };
};

export type ActionTask = {
  id: string;
  actionId: string;
  prompt: string;
  expectedFormat: ActionTemplate["outputFormat"];
  sourceIds: string[];
  chunkIds: string[];
  rubric: string[];
};
```

Create `src/types/rewards.ts`:

```ts
export type RewardSpec = {
  id: string;
  projectId: string;
  objectives: Array<{
    id: string;
    label: string;
    baseReward: number;
    validityChecks: string[];
    clusterKey: "exact" | "concept_overlap" | "format_and_concept" | "llm_optional";
    divideRewardByValidClusterSize: boolean;
  }>;
  invalidOutputReward: 0;
};
```

Create `src/types/jobs.ts`:

```ts
export type JobStatus = "queued" | "running" | "complete" | "failed" | "cancelled";

export type BuildJob = {
  id: string;
  projectId: string;
  status: JobStatus;
  currentStep?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};
```

## Artifact output contract

Every generated project must write this folder:

```text
storage/projects/<projectId>/
  manifest.json
  domain_spec.json
  source_manifest.json
  sources.jsonl
  documents/
    source_001.md
    source_002.md
  chunks.jsonl
  datasets/
    train_qa.jsonl
    eval_qa.jsonl
    practice_questions.md
    flashcards.md
  castform_project/
    README.md
    config.yaml
    data/
      docs/
      chunks.jsonl
      train_qa.jsonl
      eval_qa.jsonl
    src/
      train.py
      environment.py
      rewards.py
  logs/
    build_logs.jsonl
```

`manifest.json` must include:

```json
{
  "projectId": "...",
  "createdAt": "...",
  "prompt": "...",
  "domain": "...",
  "artifactVersion": "0.1.0",
  "metrics": {
    "sources": 0,
    "documents": 0,
    "chunks": 0,
    "trainQa": 0,
    "evalQa": 0,
    "practiceQuestions": 0
  },
  "generatedFiles": []
}
```

## App pages

### `/` — Dashboard / product home

This is not a marketing placeholder. It should be an operational dashboard with:

- Header: “CastGenie”
- Primary action: “Create domain assistant”
- Explanation card: “English → RAG assistant → Castform workspace”
- Recent projects table or Empty state
- Small workflow cards: Plan, Source, Corpus, Assistant, Castform Export

Use:

- `Card`
- `Button`
- `Badge`
- `Table`
- `Empty`
- `Sheet` for mobile nav

### `/projects/new` — Create project

Form fields:

- Project name
- Main prompt textarea
- Demo vertical select: CA Advanced Accounting, GST Basics, MBBS Cardiology Education, Custom
- Allowed domains textarea
- Max sources select
- Checkboxes:
  - Generate practice questions
  - Generate eval set
  - Generate Castform export
  - Use mock seed data if APIs are unavailable
- Submit button: “Build workspace”

On submit:

- Create project.
- Run build pipeline.
- Navigate to `/projects/[projectId]`.

### `/projects/[projectId]` — Project workspace

Use Tabs:

1. Overview
2. Sources
3. Corpus
4. Datasets
5. Assistant
6. Castform Export
7. Logs

Overview includes:

- Status badge
- Build stepper
- Metrics cards
- Domain spec card
- Next action panel

Sources includes:

- Source table with title, domain, provider, permission, fetchedAt
- Alert explaining source policy

Corpus includes:

- Chunk preview
- Document list
- Search input for chunks

Datasets includes:

- QA table
- Practice-question markdown preview
- Export buttons

Assistant includes:

- Working chat interface
- Source citations under each answer
- Suggested prompts

Castform Export includes:

- Generated folder tree
- README preview
- `config.yaml` preview
- `train.py` preview
- Download ZIP button, optional
- “Launch training” disabled unless env vars exist

Logs includes:

- Build logs table
- Error alert if failed
- Retry button

## Required UI components

Build custom components under `src/components/projects` and use shadcn primitives inside them.

Required components:

```text
PageShell
PageHeader
AppSidebar
MobileNav
StatusBadge
NewProjectForm
BuildStepper
MetricCard
DomainSpecCard
SourceTable
CorpusPreview
DatasetPreview
ArtifactGrid
AssistantChat
CitationList
ExportPanel
LogsTable
```

Avoid nested cards. Use sections, separators, and grids instead.

## Theme rules

In `globals.css`, set semantic tokens. The primary should feel warm gold/green.

Do not hardcode repeated colors like `text-yellow-600` everywhere. Use tokens:

```css
:root {
  --background: ...;
  --foreground: ...;
  --card: ...;
  --card-foreground: ...;
  --primary: ...;
  --primary-foreground: ...;
  --secondary: ...;
  --secondary-foreground: ...;
  --muted: ...;
  --muted-foreground: ...;
  --border: ...;
  --ring: ...;
}
```

Use Tailwind classes like:

```text
bg-background text-foreground
bg-card text-card-foreground
text-muted-foreground
border-border
bg-primary text-primary-foreground
```

## Build waves

Codex must implement one wave at a time. Each wave must pass its acceptance checks before moving to the next wave.

---

# Wave 0 — Scope lock and repo initialization

## Goal

Create the Next.js + shadcn foundation and commit the initial clean shell.

## Tasks

1. Initialize Next.js with App Router, TypeScript, Tailwind, ESLint, and `src` directory.
2. Initialize shadcn with Radix base and component source under `src/components/ui`.
3. Add required shadcn components.
4. Add lucide-react and utility dependencies.
5. Create `.env.example`.
6. Create base folders:
   - `src/components/app`
   - `src/components/projects`
   - `src/lib`
   - `src/server`
   - `src/types`
   - `storage/.gitkeep`
7. Ensure `pnpm lint` and `pnpm build` pass.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Manual browser check:

- Home page loads.
- No console errors.
- No horizontal overflow at 320px.

## Codex prompt

```text
Implement Wave 0 only from CASTGENIE_CASTFORM_CODEX_BUILD_GUIDE.md. Initialize the Next.js App Router TypeScript project with Tailwind and shadcn/ui Radix components under src/components/ui. Add the required components and dependencies. Create .env.example and the base folder structure. Do not build product features yet. Run lint and production build before stopping.
```

---

# Wave 1 — Static product UI shell

## Goal

Build the full navigable product UI using static/mock data. No backend pipeline yet.

## Tasks

1. Build `PageShell`, `AppSidebar`, `MobileNav`, and `PageHeader`.
2. Build `/` dashboard with recent projects empty state and workflow cards.
3. Build `/projects/new` form UI only.
4. Build static `/projects/demo` workspace route if dynamic route is not ready yet.
5. Add tabs and placeholder sections for Overview, Sources, Corpus, Datasets, Assistant, Castform Export, Logs.
6. Use responsive layout:
   - Sidebar on desktop.
   - Sheet nav on mobile.
   - No horizontal scrolling.
7. Use lucide icons consistently.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Manual browser check:

- 320px: nav works through Sheet.
- 390px: forms are not cramped.
- Tablet: cards wrap cleanly.
- Desktop: sidebar and content spacing feel premium.
- No clipped tabs; tabs may wrap or become horizontally scrollable within their own container, but the page must not overflow.

## Codex prompt

```text
Implement Wave 1 only. Build the static shadcn-native UI shell for CastGenie: dashboard, new project page, and project workspace tabs with mock data. Use the required components and lucide-react icons. Keep it operational-looking, not a marketing placeholder. Make it responsive at 320px, 390px, tablet, and desktop. Run lint and build before stopping.
```

---

# Wave 2 — Data contracts, storage, and seeded demo project

## Goal

Make the app load real project data from local JSON storage and a deterministic seeded demo.

## Tasks

1. Add all core TypeScript types.
2. Implement local storage helpers:
   - create project
   - read project
   - update project
   - list projects
   - write artifact files
   - read artifact previews
3. Create a seeded CA Advanced Accounting demo project.
4. Create seed documents in code, not scraped yet.
5. Generate seed artifacts:
   - `domain_spec.json`
   - `source_manifest.json`
   - `documents/*.md`
   - `chunks.jsonl`
   - `train_qa.jsonl`
   - `eval_qa.jsonl`
   - `practice_questions.md`
6. Dashboard should show real projects from storage.
7. `/projects/[projectId]` should load by ID.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- Loading `/` shows seeded project.
- Opening the seeded project shows metrics from actual artifact files.
- Artifact previews render actual content.

## Codex prompt

```text
Implement Wave 2 only. Add TypeScript data contracts, local filesystem storage, and a seeded CA Advanced Accounting demo project. The dashboard and project workspace must read actual project/artifact data from storage, not hardcoded UI arrays. Generate domain_spec, source_manifest, docs, chunks, train/eval QA JSONL, and practice_questions.md. Run lint and build before stopping.
```

---

# Wave 3 — Backend job pipeline and English-to-model planner

## Goal

Let the user submit an English model request and have the backend automatically create a project, infer the intended model behavior, choose an ingestion/training plan, and run a deterministic mock job end-to-end.

## Tasks

1. Add a backend job abstraction with project/job states, logs, retry metadata, and progress events. Local JSON is acceptable for demo, but the interface should map cleanly to Postgres tables.
2. Implement `POST /api/projects` to create a project from the English request and enqueue/start a build job.
3. Implement `POST /api/projects/[projectId]/build` and `GET /api/projects/[projectId]/jobs` for job execution/status.
4. Create a mock planner that converts English into:
   - `ModelGoal`: target user, domain, intended model capabilities, actions, risk level.
   - `SourcePlan`: needed source types, permission assumptions, upload/search/import strategy.
   - `TrainingPlan`: RAG-first plan, train/eval dataset types, reward/eval objectives, Castform target.
5. Build deterministic job steps:
   - planning model goal
   - planning sources
   - ingesting seed/user/mock documents
   - normalizing domain graph
   - cleaning corpus
   - chunking/indexing
   - generating train/eval/action datasets
   - generating reward/eval specs
   - preparing Castform workspace
   - ready
6. Store all generated project/job state in storage and show it in the UI.
7. Keep `MOCK_MODE=true` fully reliable with no external keys.

## Domain behavior examples

For CA ed-tech, the planner should infer actions like:

```text
Generate Advanced Accounting paper
Generate Direct Tax MCQs
Create simplified lesson
Create answer key with marking scheme
Generate weak-topic practice set
```

For OWASP/code security, the planner should infer actions like:

```text
Scan codebase for OWASP bugs
Explain vulnerability and fix
Generate secure-code review checklist
Create vulnerable/fixed code-pair evals
```

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- User can create a project from `/projects/new`.
- Project artifacts are generated in `storage/projects/<projectId>/`.
- Project page shows backend job steps and generated model/action plan.
- Logs show each step and can be read after refresh.
- The app works with `MOCK_MODE=true` and no API keys.

## Codex prompt

```text
Implement Wave 3 only. Add an automatic backend job pipeline: project creation from English intent, mock planner, model goal/source plan/training plan, deterministic ingestion/chunking/dataset/reward-spec generation, job logs, and ready-state UI. The user should not manually configure RAG/training internals. Keep MOCK_MODE=true reliable. Run lint and build before stopping.
```

---

# Wave 4 — Domain import adapters and Wire Neurons-style CA importer

## Goal

Add domain ingestion adapters so CastGenie can consume structured data dumps, user-uploaded/licensed files, and mock sources instead of pretending web scraping is the only path.

## Tasks

1. Define a generic ingestion interface:

```ts
type DomainImportAdapter = {
  id: string;
  detect(input: ImportInput): Promise<boolean>;
  import(input: ImportInput): Promise<ImportedDomainBundle>;
};
```

2. Support mock/local adapters:
   - synthetic seed adapter
   - local folder JSON adapter
   - Wire Neurons-style CA extraction adapter
   - uploaded PDF/JSON adapter placeholder
   - codebase adapter placeholder for OWASP/security domains
3. For Wire Neurons-style CA data, support these shapes without copying the whole source repo:
   - syllabus JSON with papers/chapters/PDF URLs
   - enriched chapter profiles with topics, sub-topics, key concepts, methods/formulae, ICAI treatment
   - paper extraction JSON with questions, marks, concepts, answer format, answer summary
   - quality tags such as high-risk, formula-heavy, tax, audit, law-heavy
4. Normalize imports into:
   - `DomainGraph`
   - `SourceRecord`
   - `DocumentRecord`
   - `ChunkRecord`
   - `TaskTemplate`
   - `PermissionRecord`
5. Add import summary UI: source counts, question counts, chapter counts, risk tags, and permission status.
6. Do not copy Wire Neurons data into CastGenie by default. Read from configured paths or uploaded/imported files.
7. Keep production safety: past papers, textbook PDFs, proprietary data, and codebases must be treated as user-provided/licensed unless explicitly public and permitted.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- CA adapter can import a small fixture shaped like Wire Neurons output.
- Imported syllabus/chapter/question data appears in project artifacts.
- Dashboard/project UI shows import counts and permission status.
- MOCK_MODE still works without external data.

## Codex prompt

```text
Implement Wave 4 only. Add domain import adapters and a Wire Neurons-style CA importer that normalizes syllabus, enriched chapter profiles, paper questions, and quality tags into CastGenie project artifacts. Do not vendor the entire Wire Neurons dataset. Keep imports permission-aware and domain-agnostic, with placeholders for uploaded files and codebase/security imports. Run lint and build before stopping.
```

---

# Wave 5 — Working RAG assistant and action layer

## Goal

Make every generated project include an immediate usable assistant and prebuilt domain actions backed by the local corpus while Castform training is pending.

## Tasks

1. Implement local retrieval in `src/lib/retrieval.ts`.
2. Retrieval can start simple:
   - tokenize query
   - score chunks by keyword overlap, title/topic match, tags, and task type
   - return top 3–8 chunks
3. Implement `POST /api/projects/[projectId]/chat`.
4. Mock LLM mode should synthesize answers from retrieved chunks with citations.
5. Add provider adapters for Gemini/OpenAI/Anthropic if keys exist; keep mock default.
6. Add action templates generated by the planner/importer:
   - ed-tech: generate lesson, MCQs, paper, answer key, weak-topic practice
   - code/security: scan code, explain vulnerability, generate checklist, create secure-code quiz
7. Implement `POST /api/projects/[projectId]/actions/[actionId]`.
8. Assistant UI:
   - message list
   - user input
   - citations under assistant response
   - suggested prompts
   - action buttons
   - loading skeleton
9. Log chat/action traces under:

```text
storage/projects/<projectId>/logs/chat_traces.jsonl
storage/projects/<projectId>/logs/action_traces.jsonl
```

10. Add thumbs-up/thumbs-down controls for trace training.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- Ask a corpus-grounded question and receive an answer with citations.
- Click an ed-tech action like “Generate Advanced Accounting paper” in the CA demo and receive structured output.
- Chat/action traces are saved.
- Works without external LLM keys in mock mode.

## Codex prompt

```text
Implement Wave 5 only. Build the working local RAG assistant and prebuilt domain actions over generated project chunks. Actions must be generated from the model goal/imported domain, not hardcoded only for CA. In mock mode, synthesize cited answers and action outputs from local chunks. Save chat/action traces and add feedback controls. Run lint and build before stopping.
```

---

# Wave 6 — Artifact browser and Castform-ready workspace export

## Goal

Make the generated backend output visible, inspectable, and exportable as a Castform-ready training workspace.

## Tasks

1. Build artifact browser in the UI.
2. Show generated file tree for manifest, domain graph, source manifest, documents, chunks, train/eval datasets, action templates, reward specs, logs, and Castform workspace.
3. Add preview panels for:
   - `domain_spec.json`
   - `domain_graph.json`
   - `source_manifest.json`
   - `chunks.jsonl`
   - `datasets/train_qa.jsonl`
   - `datasets/eval_qa.jsonl`
   - `datasets/action_tasks.jsonl`
   - `rewards/reward_spec.json`
   - `castform_project/README.md`
   - `castform_project/config.yaml`
4. Implement `GET /api/projects/[projectId]/export` returning a downloadable ZIP if feasible.
5. Generate Castform project folder with:

```text
castform_project/
  README.md
  config.yaml
  data/
    docs/
    chunks.jsonl
    train_qa.jsonl
    eval_qa.jsonl
    action_tasks.jsonl
  rewards/
    reward_spec.json
  src/
    train.py
    environment.py
    rewards.py
```

6. `train.py` should be a safe scaffold. It should not crash the website if Castform SDK is not installed.
7. Include a README section requiring source-permission review before training.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- User can view generated Castform files.
- User can download or copy artifacts.
- Castform export exists for every generated project.
- Reward/action specs are visible.

## Codex prompt

```text
Implement Wave 6 only. Build the artifact browser and Castform-ready workspace export. Include domain graph, chunks, train/eval datasets, action task datasets, reward specs, logs, and safe Python scaffolds. Add ZIP or per-file download/copy affordances. Do not require Castform SDK installation. Run lint and build before stopping.
```

---

# Wave 7 — Evals, reward shaping, and diversity-aware dataset quality

## Goal

Show Castform-relevant thinking: evals, traces, rewards, dataset quality, and diversity-aware training signals inspired by Castform’s RL diversity guidance.

## Tasks

1. Add Evaluation panel.
2. Show eval questions from `eval_qa.jsonl` and action evals from `datasets/action_tasks.jsonl`.
3. Add “Run local eval” action:
   - ask assistant/action runner each eval question/task
   - score citation presence, retrieved-source overlap, keyword/concept overlap, format validity, and safety compliance
   - show pass/partial/fail
4. Add candidate diversity checks:
   - generate multiple question/lesson/action candidates per objective
   - cluster near-duplicates by deterministic heuristics first, optional LLM later
   - score valid clusters without rewarding invalid novelty
   - store diversity metrics
5. Implement reward spec output:

```text
storage/projects/<projectId>/rewards/reward_spec.json
```

6. Use the Castform RL diversity principle:
   - invalid outputs get zero reward
   - valid repeated cluster members divide base reward by cluster size
   - do not add diversity bonus to wrong/unsafe outputs
7. Save eval results:

```text
storage/projects/<projectId>/logs/eval_results.jsonl
```

8. Add trace export:

```text
storage/projects/<projectId>/logs/chat_traces.jsonl
storage/projects/<projectId>/logs/action_traces.jsonl
```

9. Add Castform trace-readiness panel:

```text
Traces collected: X
Positive examples: Y
Negative examples: Z
Valid clusters: N
Duplicate collapse risk: low/medium/high
Ready for trace-based improvement: yes/no
```

10. Add “Export traces/evals/reward spec” button.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- Eval questions render.
- Local eval can run.
- Eval results are saved.
- Candidate diversity metrics render.
- Reward spec is generated.
- Chat/action feedback updates trace readiness.

## Codex prompt

```text
Implement Wave 7 only. Add evals, trace export, reward spec generation, and diversity-aware dataset quality checks. Follow the Castform RL diversity lesson: cluster valid candidates and divide reward by cluster size, but give invalid outputs zero reward. Keep deterministic heuristics first. Run lint and build before stopping.
```

---

# Wave 8 — Automatic web discovery and scrape import

## Goal

Implement Wave 8 as CastGenie’s first automatic public-source discovery layer. After Wave 7, users can upload source files. Wave 8 lets the backend infer search needs from the English model intent, discover public web sources, extract usable markdown, and feed those sources into the existing local JSON pipeline, RAG assistant, artifacts, and Castform export.

Mock mode remains the reliability baseline. Real Exa and Firecrawl calls are optional enhancements behind env vars.

## Provider references

Use provider contracts only, no SDK dependency in Wave 8.

Exa Search:

- Canonical setup guide: https://docs.exa.ai/reference/search-api-guide-for-coding-agents
- Endpoint: `POST /search`
- Base URL: `https://api.exa.ai`
- Auth: `x-api-key`
- Inputs: query, `type`, `includeDomains`, `numResults`, content options
- Default Wave 8 search type: `auto`
- Default Wave 8 content mode: `contents.highlights=true`
- Output: ranked web results with title, URL, and highlights/snippet content when available

Default Exa request shape:

```json
{
  "query": "user intent derived source query",
  "type": "auto",
  "includeDomains": ["optional-allowed-domain.example"],
  "numResults": 10,
  "contents": {
    "highlights": true
  }
}
```

Keep Wave 8 on raw `results` plus highlights. Do not use Exa `outputSchema`, synthesized search, or deep search by default; those are later enhancements for structured enrichment.

Firecrawl Scrape:

- Endpoint: `POST /v2/scrape`
- Base URL: `https://api.firecrawl.dev`
- Auth: Bearer token
- Input: URL, output format
- Output: markdown when available

## Tasks

1. Add web discovery contracts:
   - `WebSearchPlan`
   - `WebSearchResult`
   - `WebScrapeResult`
   - `WebDiscoveryReport`
   - provider trace records for mock/Exa/Firecrawl calls.
2. Add provider adapters:
   - mock web discovery provider, always available
   - Exa provider, used only when `MOCK_MODE=false` and `EXA_API_KEY` exists
   - Firecrawl scraper, used only when `MOCK_MODE=false` and `FIRECRAWL_API_KEY` exists
   - graceful fallback to mock/no-scrape when providers fail.
3. Integrate into import pipeline:
   - uploaded parseable files remain highest priority
   - if no uploaded parseable files exist, run web discovery before CA/security/generic synthetic fallback
   - convert discovered/scraped markdown into existing `SourceRecord`, `DocumentRecord`, chunks, datasets, actions, reward spec, and Castform export
   - preserve URL, provider, fetchedAt, permission status, scrape status, and warnings.
4. Add artifacts:
   - `imports/web_search_plan.json`
   - `imports/web_discovery.json`
   - `imports/web_scrape_report.json`
   - discovered source documents under existing `documents/`
   - all generated data continues through `source_manifest.json`, `chunks.jsonl`, datasets, rewards, and `castform_project/`.
5. Update UI:
   - Sources tab shows web discovery summary, provider used, query, allowed domains, discovered URLs, scraped/skipped status, and warnings
   - Artifact browser previews web discovery artifacts
   - New project form keeps allowed domains and max sources meaningful for web discovery.

## Rules

- Never scrape login-only, paywalled, or obviously restricted sources.
- Do not treat unknown web permissions as licensed.
- Real provider calls must never run in `MOCK_MODE=true`.
- App must work with no Exa or Firecrawl keys.
- Do not add LangChain, MCP, or provider SDKs in Wave 8.
- Keep local JSON as source of truth.

## Acceptance checks

```bash
pnpm lint
pnpm build
pnpm audit --audit-level moderate
```

Functional check:

- Create a generic project with no uploads and web discovery enabled; confirm mock web provider generates web discovery artifacts and assistant answers cite discovered chunks.
- Create a CA project with no uploads; confirm current CA fixture behavior remains valid unless web discovery is explicitly selected and available.
- Create a project with uploaded files; confirm uploads still take precedence over web discovery.
- Set no Exa/Firecrawl keys; confirm `MOCK_MODE=true` works without failures.
- With `EXA_API_KEY` only, confirm search results are recorded and usable highlights are imported when available.
- With `EXA_API_KEY` and `FIRECRAWL_API_KEY`, confirm selected URLs with insufficient search text are scraped to markdown and imported.
- Confirm source manifest, chunks, citations, Castform ZIP, artifact previews, and logs include web provenance.

## Codex prompt

```text
Implement Wave 8 only. Add automatic public web discovery and scrape import behind env flags. Use Exa /search with type=auto and contents.highlights=true, use Firecrawl /v2/scrape for markdown extraction when search results lack usable text, preserve MOCK_MODE reliability, provenance, permission metadata, graceful failures, upload precedence, and local JSON as source of truth. Run lint, build, and audit before stopping.
```

---

# Wave 9 — Castform training, hosting, and model endpoint linkage

## Goal

Launch or mock a Castform training/hosting run, store model version metadata, and connect chat/actions to the hosted model when available.

## Tasks

1. Add `CASTFORM_API_KEY` and `CASTFORM_BASE_URL` detection.
2. Add server-side Castform provider interface:

```ts
type CastformProvider = {
  createTrainingRun(input: {
    projectId: string;
    corpusPath: string;
    trainDatasetPath: string;
    evalDatasetPath: string;
    actionDatasetPath?: string;
    rewardSpecPath?: string;
  }): Promise<{ runId: string; statusUrl?: string }>;
  getTrainingRun(runId: string): Promise<CastformRunStatus>;
  getModelEndpoint(runId: string): Promise<{ modelId: string; endpointUrl?: string }>;
};
```

3. Implement mock Castform provider.
4. Implement real launcher only if current Castform/benchmax SDK/API is available in the environment.
5. In UI, show:
   - “Castform export ready” always
   - “Launch training” enabled only if configured
   - training status timeline
   - model id/version when available
   - endpoint/connection status for chat/actions
6. Save run/model metadata:

```text
storage/projects/<projectId>/logs/castform_runs.jsonl
storage/projects/<projectId>/model_versions.json
```

7. When a hosted model is available, route chat/action calls through the Castform model adapter with RAG context.
8. Without Castform credentials, keep local RAG assistant and mock model behavior working.

## Acceptance checks

```bash
pnpm lint
pnpm build
```

Functional check:

- Without Castform env vars, button is disabled with helpful explanation.
- With mock provider, a fake run ID is generated and saved.
- Mock model version is linked to chat/action UI.
- Real provider failure is logged and does not break project.

## Codex prompt

```text
Implement Wave 9 only. Add Castform training/hosting provider interfaces with mock provider by default and real provider only if the current Castform/benchmax SDK/API is available. Save run/model metadata, show training status, and route chat/actions through the hosted model when available. The app must continue working without Castform credentials. Run lint and build before stopping.
```

---

# Wave 10 — Productized action experience and hardening

## Goal

Make CastGenie demo-safe and product-shaped: users should experience the generated model through practical actions, not just files.

## Tasks

1. Build action pages/panels for generated model capabilities:
   - ed-tech paper generation
   - MCQ generation
   - lesson generation
   - answer key generation
   - code/security scan report placeholder
2. Add loading skeletons for all async states.
3. Add error alerts and retry buttons.
4. Add empty states for no sources, no datasets, no logs, no model runs.
5. Add copy/download buttons for key outputs, files, prompts, and action results.
6. Add README with:
   - product thesis
   - backend automation principle
   - setup commands
   - env vars
   - mock mode
   - real provider mode
   - database option
   - Castform mode
   - demo script
   - limitations and permission policy
7. Add tests for:
   - model planner
   - import adapters
   - storage/job state
   - chunking/retrieval
   - dataset generation
   - diversity/reward scoring
   - action templates
8. Run full responsive/browser checks.

## Acceptance checks

```bash
pnpm lint
pnpm build
pnpm test
```

Manual browser check:

- Desktop.
- Tablet.
- 390px mobile.
- 320px mobile.
- No horizontal overflow.
- No clipped titles.
- No console errors.
- Forms have labels and focus states.
- Mobile navigation works.
- Project creation works.
- Assistant works.
- Domain actions work.
- Artifact export visible.
- Castform training status visible.

## Codex prompt

```text
Implement Wave 10 only. Harden the demo and productize the action experience: generated actions, loading/error/empty states, copy/download controls, README, tests, and responsive fixes. Run lint, tests, production build, and manual browser checks at desktop, tablet, 390px, and 320px. Fix any horizontal overflow, clipped text, console errors, or cramped cards before stopping.
```

## Seed corpus content requirements

For CA Advanced Accounting demo, seed documents should be original synthetic educational material, not copied from proprietary textbooks.

Create at least 6 synthetic markdown docs:

```text
1. Introduction to company accounts and financial statements
2. Consolidated financial statements basics
3. Goodwill and capital reserve in acquisition accounting
4. Non-controlling interest and pre-acquisition profits
5. Internal transactions and unrealized profit adjustments
6. Exam-style journal-entry problem patterns
```

Each doc should include:

- Title
- Scope note
- Key concepts
- Step-by-step explanation
- Mini example
- Common mistakes
- Source note: “Synthetic demo material for product prototype; replace with licensed/official sources for production.”

This avoids legal dependency in the initial demo.

## Dataset-generation rules

Generate:

- 40–60 train QA pairs.
- 10–20 eval QA pairs.
- 30–50 practice questions.
- 10–20 flashcards.

Question types:

```text
conceptual
step-by-step
calculation setup
journal-entry reasoning
common mistake correction
source-grounded citation question
```

Every QA pair must include:

```json
{
  "id": "...",
  "type": "train",
  "topic": "...",
  "question": "...",
  "expectedAnswer": "...",
  "sourceIds": ["..."],
  "chunkIds": ["..."],
  "difficulty": "medium"
}
```

## RAG answer format

Assistant answers should follow this structure by default:

```text
Direct answer

Step-by-step explanation

Example

Common mistake

Practice question

Sources
```

For compliance/medical/financial domains, include a safety note when relevant.

## Citation behavior

Every assistant answer must cite at least one chunk if retrieval found context.

Citation display:

```text
Sources
[1] Consolidated Financial Statements Basics — chunk_abc123
[2] Goodwill and Capital Reserve — chunk_def456
```

If no context is found:

```text
I do not have enough source material in this workspace to answer that reliably. Add more source documents or broaden the corpus.
```

## Safety and source policy

Implement basic safeguards:

- No scraping login-only or paywalled pages.
- No pretending unknown source permissions are licensed.
- Store permission status in `source_manifest.json`.
- Add warning for high-risk domains like medicine/legal/tax:
  - educational only
  - not professional advice
  - cite sources
  - recommend consulting qualified professional when asked for personal advice

For demo purposes, source data can be synthetic and clearly labeled.

## Product copy

Use this copy in the UI.

### Dashboard header

```text
CastGenie
English to working domain assistant and Castform-ready training workspace.
```

### New project description

```text
Describe the expert assistant you want. CastGenie will plan the corpus, create source files, generate datasets, and prepare a working RAG assistant with Castform-ready artifacts.
```

### Castform export note

```text
This workspace is structured for Castform-style RAG training: corpus files, chunks, QA pairs, eval pairs, reward scaffold, and training entrypoint. Review source permissions before launching any real training run.
```

### Source policy note

```text
Use public, licensed, or user-provided source material. Unknown web permissions are tracked in the manifest and should be reviewed before training.
```

### Empty dashboard state

```text
No workspaces yet
Create your first domain assistant from a plain-English prompt.
```

## Demo script

Use this exact demo flow:

1. Open dashboard.
2. Click “Create domain assistant.”
3. Paste:

```text
Build me an expert assistant for CA Final Advanced Accounting in India. It should explain consolidation concepts, solve journal-entry style problems step-by-step, generate practice questions, and cite the source material.
```

4. Choose:

```text
Vertical: CA Advanced Accounting
Max sources: 8
Use mock seed data: checked
Generate practice questions: checked
Generate eval set: checked
Generate Castform export: checked
```

5. Click “Build workspace.”
6. Show build stepper completing.
7. Open Sources tab: show source manifest.
8. Open Corpus tab: show chunks.
9. Open Datasets tab: show train/eval/practice questions.
10. Open Assistant tab and ask:

```text
Explain pre-acquisition profits in consolidation and give me a practice question.
```

11. Show answer with citations.
12. Open Castform Export tab: show folder tree and generated files.
13. Say:

```text
The product hides RAG and training infrastructure behind plain English. Users get an immediate assistant, while Castform receives clean artifacts for post-training.
```

## Definition of done

The project is demo-ready only when all are true:

- A user can create a workspace from a prompt.
- A CA Advanced Accounting workspace can be built in mock mode.
- The app writes actual artifact files.
- The dashboard reads actual project data.
- The assistant answers from generated chunks with citations.
- QA/eval/practice-question files are visible.
- Castform export files are visible.
- App works without external API keys.
- App has real provider adapters behind env flags.
- UI uses shadcn components and semantic tokens.
- UI is responsive at 320px, 390px, tablet, laptop, desktop.
- `pnpm lint`, `pnpm test` if available, and `pnpm build` pass.
- No console errors.
- No horizontal overflow.
- README explains thesis, setup, mock mode, real providers, and demo script.

## Final note to Codex

Build the project like a real internal product prototype, not a landing page. The winning impression is:

```text
This person understands Castform’s adoption problem and built a product-shaped on-ramp: English → corpus → RAG → evals → traces → Castform training artifacts.
```
