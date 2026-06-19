# CastGenie

CastGenie is a local-first prototype for turning an English model intent into a source-grounded assistant workspace. It creates project artifacts, import summaries, local RAG chat/actions, traces, Castform-ready export scaffolds, readiness checks, and mock training runs.

The product thesis is simple: a user describes the expert assistant or model workflow they want in plain English, and CastGenie handles planning, source intake, chunking, dataset generation, actions, traces, artifacts, and Castform handoff behind the scenes.

## Current Wave Status

- Wave 0-3: Next.js foundation, local JSON project storage, backend build pipeline, English-to-model planner.
- Wave 4: import adapter layer with CA fixture, security placeholder, and synthetic fallback.
- Wave 5: local RAG assistant, generated actions, traces, feedback, optional Gemini provider.
- Wave 6: artifact browser and Castform-ready ZIP export.
- Wave 7: real local source intake for TXT, MD, JSON, JSONL, and CSV uploads.
- Wave 8: automatic web discovery with mock-first Exa/Firecrawl provider adapters.
- Wave 9: Castform readiness checks, mock training runs, model versions, and opt-in Python launcher.
- Wave 10: final local demo hardening, productized actions, tests, docs, and responsive checks.

This is intentionally simple local infrastructure. Local JSON storage is the source of truth for this project.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Before committing a wave, run:

```bash
pnpm lint
pnpm test
pnpm build
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
CASTFORM_API_KEY=
CASTFORM_BASE_URL=
CASTFORM_PYTHON_BIN=python3
CASTFORM_REAL_RUNS_ENABLED=false
```

`MOCK_MODE=true` must work without provider keys. Set provider keys only in `.env.local`; never commit them.

## Demo Script

Use this 90-second local demo flow:

1. Open `/` and show that CastGenie turns plain-English model intent into a workspace.
2. Open `/projects/new`, enter a domain request, and create a project.
3. Show the project Overview: model goal, source/import summary, generated actions, and job state.
4. Open Sources and explain uploaded files, mock web discovery, permission status, and warnings.
5. Open Assistant, ask a source-grounded question, then run one generated action.
6. Show citations, feedback, copy controls, and markdown download for action results.
7. Open Castform Export, show artifacts, download ZIP, and create a mock Castform run.
8. Explain that real Castform launch is opt-in and blocked unless source permissions and env vars are ready.

## Final Local Demo Checklist

- Create a project from an English prompt.
- Create a project from an uploaded `.md`, `.txt`, `.json`, `.jsonl`, or `.csv` file.
- Confirm mock web discovery works with no Exa or Firecrawl keys.
- Ask the assistant a question and verify citations.
- Run a generated action and verify citations, copy, feedback, and `.md` download.
- Download the Castform ZIP.
- Create and refresh a mock Castform run until a model version appears.
- Confirm real Castform launch remains disabled or blocked without env configuration.

## Local Storage

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

## Castform Export

Each successful build prepares `castform_project/` with:

- `README.md`
- `config.yaml`
- copied corpus data
- reward spec
- inert Python scaffolds

The scaffolds do not import Castform at module load and do not make network calls. Wave 9 can create mock runs locally and can call a real Castform Python runner only when explicitly configured.

## Castform Runs

Wave 9 adds local readiness checks and mock training runs. Real Castform launch is disabled by default and only appears when `CASTFORM_REAL_RUNS_ENABLED=true`, `CASTFORM_API_KEY`, `CASTFORM_BASE_URL`, and a Python runtime are configured.

The Python runner lives at `scripts/castform_runner.py`. It imports `benchmax` only during an explicit real launch/status check and never logs API keys. Without Castform configuration, the app still uses the local RAG assistant and mock run history.

## Limitations

- Local JSON and filesystem storage only.
- No authentication, billing, multi-user permissions, queue workers, or Postgres.
- No PDF extraction.
- No real codebase scanning; OWASP codebase import remains a placeholder.
- Real Castform launch requires local Python, `benchmax`, credentials, and permission-clean artifacts.
- Generated outputs are prototype artifacts and need human review before real training or production use.
