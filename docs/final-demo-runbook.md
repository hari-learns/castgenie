# Final Local Demo Runbook

## 1. Preflight

Run:

```bash
pnpm demo:preflight
```

The command checks environment presence without printing secrets, verifies Supabase schema access, checks Exa with a bounded SEBI allowed-domain query, verifies Python can import `benchmax`, and reports queued/failed jobs.

Do not continue to the real demo if preflight fails. If queued jobs exist, run `pnpm worker:once` until the queue is clear.

## 2. No-Spend Local Proof

Run:

```bash
pnpm demo:local
```

This creates a local uploaded-source project, builds Castform artifacts, writes a demo report under `storage/demo-runs/`, and does not launch Castform training.

## 3. Real Castform Demo

Run only when you explicitly want to allow a paid-capable Castform launch:

```bash
CASTGENIE_DEMO_REAL_RUN=true pnpm demo:real
```

The canonical prompt builds a SEBI LODR compliance assistant from Exa-discovered `sebi.gov.in` sources. It then validates readiness, queues/executes the Castform training job through the worker path, and writes a demo report.

## 4. Hosted Model Verification

Castform training may take time. After the external run progresses, verify again:

```bash
pnpm demo:verify-hosted --project <projectId>
```

This refreshes the latest real run when possible and writes a new report. Main chat/workflows are considered production-ready only when `model_versions.json` contains a hosted Castform model id.

## 5. What Counts As Success

- Real source provider is Exa, not mock.
- Selected sources are from allowed domains and marked `allowed_public`.
- `castform_project/` contains valid train/eval datasets and RAG files.
- Castform validation passes before launch.
- A Castform run id or status URL is recorded.
- Hosted model metadata appears only after the run is complete/hosted.
- Main chat routes to Castform; Gemini/mock remains preview-only.

## Known Limits

- No production deployment.
- No auth or multi-user permission model.
- No object storage for generated artifacts.
- Firecrawl is not required.
- PDF extraction and real codebase scanning remain out of scope.
