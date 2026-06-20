# CastGenie

CastGenie is a prototype for turning an English model intent into a Castform-trainable RAG workspace. It creates project artifacts, import summaries, local preview chat/actions, traces, Castform project files, readiness checks, and real training handoff when configured.

The product thesis is simple: a user describes the expert assistant or model workflow they want in plain English, and CastGenie handles planning, source intake, chunking, dataset generation, actions, traces, artifacts, and Castform handoff behind the scenes.

## Current Wave Status

- Wave 0-3: Next.js foundation, local JSON project storage, backend build pipeline, English-to-model planner.
- Wave 4: import adapter layer with CA fixture, security placeholder, and synthetic fallback.
- Wave 5: local RAG assistant, generated actions, traces, feedback, optional Gemini provider.
- Wave 6: artifact browser and Castform-ready ZIP export.
- Wave 7: real local source intake for TXT, MD, JSON, JSONL, and CSV uploads.
- Wave 8: automatic web discovery with mock-first Exa/Firecrawl provider adapters.
- Wave 9: Castform readiness checks, mock training runs, model versions, and opt-in Python launcher.
- Wave 10-14: local demo hardening, simple workspace UX, and first corrective Castform hosted-model routing.
- Wave 15: Supabase-backed metadata, durable build jobs, and local worker runtime.
- Wave 16: real Castform RAG project generation with `run.py`, native train/eval datasets, corpus manifest, and readiness metadata.
- Wave 17: real Castform validation, launch jobs, monitoring metadata, and hosted model version records.
- Wave 18: product UX for real training status and hosted-model chat truthfulness.
- Wave 19: end-to-end real demo hardening with preflight, local proof, opt-in real Castform demo, hosted verification, and redacted reports. See `docs/wave-19-plan.md`.

Current behavior still includes local preview infrastructure. The intended product path is real-source ingestion, Castform RAG training, and hosted-model chat.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

In Supabase mode, run the worker in a second terminal:

```bash
pnpm worker
```

To process one queued job and exit:

```bash
pnpm worker:once
```

Before committing a wave, run:

```bash
pnpm lint
pnpm test
pnpm build
```

Wave 19 demo commands:

```bash
pnpm demo:preflight
pnpm demo:local
CASTGENIE_DEMO_REAL_RUN=true pnpm demo:real
pnpm demo:verify-hosted --project <projectId>
```

`demo:real` is explicitly paid-capable. It refuses to run unless `CASTGENIE_DEMO_REAL_RUN=true` is set, and it still obeys source-permission, Castform readiness, Supabase, Python, and `benchmax` gates.

## Supabase Setup

Wave 15 stores durable project metadata and job state in Supabase while keeping large artifacts under local `storage/projects/<projectId>`.

Apply the migration before using `CASTGENIE_STORAGE_MODE=supabase`:

```text
supabase/migrations/202606190001_wave15_core.sql
```

For dashboard setup, open the Supabase SQL editor for the project, paste the migration, and run it once. Service-role REST credentials cannot create tables or functions; they can only use the schema after it exists.

After applying the migration, verify:

```bash
pnpm supabase:smoke
pnpm worker:once
```

## Environment

Copy `.env.example` to `.env.local` for local secrets.

```bash
MOCK_MODE=true
LLM_PROVIDER=mock
GEMINI_API_KEY=
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-3.5-flash
EXA_API_KEY=
FIRECRAWL_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CASTGENIE_STORAGE_MODE=supabase
CASTFORM_API_KEY=
# Optional platform override. Leave empty unless Castform support gives you one.
CASTFORM_BASE_URL=
CASTFORM_PYTHON_BIN=python3.12
CASTFORM_REAL_RUNS_ENABLED=false
CASTFORM_AUTO_LAUNCH=false
CASTFORM_BASE_MODEL=Qwen/Qwen3.5-4B
CASTFORM_INFERENCE_BASE_URL=https://llm.castform.com/v1
CASTFORM_NUM_EPOCHS=5
```

`MOCK_MODE=true` must work without provider keys. Set provider keys only in `.env.local`; never commit them.

## Demo Script

Use this 90-second local demo flow:

1. Open `/` and show that CastGenie turns plain-English model intent into a workspace.
2. Open `/projects/new`, enter a domain request, and create a project.
3. Show the project Overview: model goal, source/import summary, generated actions, and job state.
4. Open Sources and explain uploaded files, mock web discovery, permission status, and warnings.
5. Open Workspace and show that main chat is locked until a hosted Castform model exists.
6. Open Training and explain whether the project is blocked, training on Castform, or ready for hosted-model chat.
7. Open Workflows and show that production workflows also require the hosted model.
8. Open Files & Export and show the generated Castform project files.

For the real demo path, use `docs/final-demo-runbook.md`. The short version is:

1. Run `pnpm demo:preflight`.
2. Run `pnpm demo:local` to prove the local no-spend path.
3. Run `CASTGENIE_DEMO_REAL_RUN=true pnpm demo:real` only when credit spend is acceptable.
4. If Castform training is still running, later run `pnpm demo:verify-hosted --project <projectId>`.
5. Treat the product as ready only when the hosted Castform model version exists and the main chat provider is Castform.

## Final Local Demo Checklist

- Create a project from an English prompt.
- Create a project from an uploaded `.md`, `.txt`, `.json`, `.jsonl`, or `.csv` file.
- Confirm mock web discovery works with no Exa or Firecrawl keys.
- Ask the assistant a question and verify citations.
- Run a generated action and verify citations, copy, feedback, and `.md` download.
- Download the Castform ZIP.
- Confirm normal chat remains locked until a hosted Castform model version exists.
- Confirm real Castform launch remains disabled or blocked without env configuration and source readiness.

## Storage

Generated project data is written under:

```text
storage/projects/<projectId>/
```

Generated project runs are ignored by Git. Important generated paths include:

- `manifest.json`
- `source_manifest.json`
- `chunks.jsonl`
- `datasets/*.jsonl`
- `imports/*.json`
- `uploads/upload_manifest.json`
- `imports/web_search_plan.json`
- `imports/web_discovery.json`
- `imports/web_scrape_report.json`
- `logs/*.jsonl`
- `castform_project/`
- `storage/demo-runs/<runId>/report.json`

## Source Uploads

Wave 7 accepts local files during project creation or from the project Sources tab.

Parsed as corpus:

- `.txt`
- `.md`
- `.json`
- `.jsonl`
- `.csv`

Stored but skipped:

- `.pdf`

Default upload limits:

- 8 files per project
- 2 MB per file
- 8 MB total uploaded source size

PDF extraction is intentionally deferred. Low-quality extraction would contaminate chunks, train/eval rows, and reward artifacts.

Uploaded files require permission attestation before real training. PDFs are stored but skipped; a PDF-only upload does not create trustworthy training text.

## Web Discovery

Wave 8 can discover public web sources when no uploaded source files are available. Mock web discovery is used when `MOCK_MODE=true` or `EXA_API_KEY` is absent.

Optional real providers:

- Exa search: `EXA_API_KEY`
- Firecrawl scrape: `FIRECRAWL_API_KEY`

Allowed domains from the project form are passed to Exa as include-domain constraints. CastGenie uses Exa `/search` directly with `type: "auto"`; broad discovery uses `contents.highlights=true`, while legal, regulatory, and compliance prompts use text content for deeper official-source context. It does not require an Exa SDK, LangChain, or MCP layer. Web sources are provenance-tracked and still require source-permission review before real training.

Unknown web-source permissions are not treated as licensed material. They block real Castform launch until reviewed.

## Castform RAG Project

Each successful build prepares `castform_project/` with a real RAG project shape:

- `README.md`
- `config.yaml`
- `run.py`
- `train_dataset.jsonl`
- `eval_dataset.jsonl`
- `data/corpus_manifest.json`
- `rag_readiness.json`
- copied corpus data and chunks
- reward spec
- `src/env.py`, `src/dataset.py`, `src/tools.py`, `src/rewards.py`, `src/train.py`

Wave 16 generates the Castform RAG workspace. Wave 17 validates and launches real Castform training through the local worker when readiness, credentials, and runtime checks pass.

## Castform Runs

CastGenie treats local Gemini/mock responses as preview only. The main model chat and production workflows unlock only after a hosted Castform model version exists.

The Python runner lives at `scripts/castform_runner.py`. It imports `benchmax` only during preflight, validation, launch, or status checks and never logs API keys. Real launch requires `CASTFORM_REAL_RUNS_ENABLED=true`, `CASTFORM_API_KEY`, the configured `CASTFORM_PYTHON_BIN` with `benchmax`, and permission-clean real sources. `CASTFORM_BASE_URL` is only an optional platform override.

## Limitations

- Local JSON and filesystem storage only.
- No authentication, billing, multi-user permissions, queue workers, or Postgres.
- No PDF extraction.
- No real codebase scanning; OWASP codebase import remains a placeholder.
- Real Castform launch requires local Python 3.12, `benchmax`, credentials, and permission-clean real sources.
- Generated outputs are prototype artifacts and need human review before real training or production use.
