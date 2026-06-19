# Wave 9 Plan: Castform Readiness, Hybrid Training Launcher, And Model Versions

## Summary

Implement Wave 9 as a simple hybrid Castform layer: every project gets local training-readiness checks, mock training runs, run history, model version metadata, and a UI status panel. Real Castform launch is supported only when explicitly configured with env vars and a Python runner. The app must remain fully usable in `MOCK_MODE=true` with no Castform credentials.

Castform’s current docs describe a `benchmax` Python workflow for RAG training. Do not invent a Node REST API unless Castform publishes one.

## Key Changes

- Add Castform contracts for `TrainingReadiness`, `CastformRun`, provider logs, and `ModelVersion`.
- Add APIs for listing runs, creating mock/real runs, and refreshing run status.
- Persist readiness, runs, model versions, and provider logs under each local project.
- Add a Python subprocess runner gated by `CASTFORM_REAL_RUNS_ENABLED`, credentials, readiness blockers, and fixed argument arrays.
- Replace the Castform export-only UI with readiness checks, run controls, model versions, and the existing artifact browser.

## Test Plan

```bash
pnpm lint
pnpm build
pnpm audit --audit-level moderate
```

Functional checks:

- Existing projects render readiness from current artifacts.
- Mock run creation appends `castform/runs.jsonl` and provider logs.
- Mock refresh progresses deterministically and writes `model_versions.json` after completion.
- Real launch without env vars is blocked clearly.
- Unknown web permissions block real launch but not mock runs.
- `/projects/demo` remains readable.
- Castform ZIP export still includes the workspace files.
- No API response or log exposes `CASTFORM_API_KEY`.
