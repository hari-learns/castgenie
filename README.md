# CastGenie

CastGenie is a local-first prototype for turning an English model intent into a source-grounded assistant workspace. It creates project artifacts, import summaries, local RAG chat/actions, traces, and Castform-ready export scaffolds.

## Current Wave Status

- Wave 0-3: Next.js foundation, local JSON project storage, backend build pipeline, English-to-model planner.
- Wave 4: import adapter layer with CA fixture, security placeholder, and synthetic fallback.
- Wave 5: local RAG assistant, generated actions, traces, feedback, optional Gemini provider.
- Wave 6: artifact browser and Castform-ready ZIP export.
- Wave 7: real local source intake for TXT, MD, JSON, JSONL, and CSV uploads.
- Wave 8: automatic web discovery with mock-first Exa/Firecrawl provider adapters.

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
```

`MOCK_MODE=true` must work without provider keys. Set provider keys only in `.env.local`; never commit them.

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

## Web Discovery

Wave 8 can discover public web sources when no uploaded source files are available. Mock web discovery is used when `MOCK_MODE=true` or `EXA_API_KEY` is absent.

Optional real providers:

- Exa search: `EXA_API_KEY`
- Firecrawl scrape: `FIRECRAWL_API_KEY`

Allowed domains from the project form are passed to Exa as include-domain constraints. Web sources are provenance-tracked and still require source-permission review before real training.

## Castform Export

Each successful build prepares `castform_project/` with:

- `README.md`
- `config.yaml`
- copied corpus data
- reward spec
- inert Python scaffolds

The scaffolds do not import Castform at module load and do not make network calls. Real Castform training/hosting is a later wave and requires source-permission review first.
