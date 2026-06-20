# Wave 19 Plan: Real Demo Hardening And End-To-End Proof

## Summary

Wave 19 proves the corrected CastGenie product loop: English intent, real source acquisition, Castform RAG workspace generation, Supabase job tracking, real Castform launch when safe, hosted model metadata, and chat/workflows routed to the hosted Castform model.

This is still a local demo. It does not add auth, billing, hosted deployment, object storage, or a new provider.

## Key Changes

- Add `pnpm demo:preflight` for masked env checks, Supabase schema reachability, Exa smoke validation, Python 3.12/`benchmax`, and queued/failed job visibility.
- Add `pnpm demo:local` for a deterministic no-spend local proof using uploaded fixture material and preview/training-readiness artifacts.
- Add `CASTGENIE_DEMO_REAL_RUN=true pnpm demo:real` for the explicit paid-capable path using Exa sources from `sebi.gov.in`, Castform readiness, validation, launch, and worker execution.
- Add `pnpm demo:verify-hosted --project <projectId>` to refresh a real Castform run and confirm hosted model metadata once training completes.
- Write ignored demo reports under `storage/demo-runs/` with project id, selected source URLs, permission status, corpus counts, Castform status, hosted model id, and latest provider labels.
- Keep Firecrawl optional. Exa is the primary source provider; Firecrawl is only fallback extraction when configured and Exa lacks useful text.

## Real Demo Guardrails

- `demo:real` refuses to run unless `CASTGENIE_DEMO_REAL_RUN=true`.
- `demo:real` refuses to run when `MOCK_MODE=true`, preflight fails, or existing queued jobs would make worker behavior ambiguous.
- Real Castform launch still depends on existing readiness gates: real permitted sources, valid datasets, valid Castform workspace, credentials, Python, and `benchmax`.
- Gemini/mock responses remain preview-only and must not be presented as the trained model.

## Test Plan

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
pnpm supabase:smoke
pnpm demo:preflight
pnpm demo:local
```

Manual paid-capable check:

```bash
CASTGENIE_DEMO_REAL_RUN=true pnpm demo:real
pnpm demo:verify-hosted --project <projectId>
```

Browser checks:

- `/`, `/projects/new`, `/projects/demo`, and the generated real-demo project load without console errors.
- The workspace shows training/model status honestly.
- Main chat unlocks only when a hosted Castform model version exists.

## Assumptions

- Supabase stores metadata and jobs; large artifacts remain local.
- Exa plus allowed official domains are enough for the canonical demo.
- Castform training may outlive a single command, so hosted-model verification is resumable.
- This wave proves the local product loop; production hosting remains separate work.
