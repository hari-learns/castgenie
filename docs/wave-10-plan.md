# Wave 10 Plan: Final Local Demo Hardening And Productized Actions

## Summary

Wave 10 finalizes CastGenie as a local demo. It does not add deployment, auth, Postgres, queues, billing, or new provider integrations. The app should feel complete for local use: project creation, source intake, web discovery, assistant chat, generated actions, artifact export, and Castform readiness are usable, documented, tested, and responsive.

This is final for a local/hiring/demo version, not production hosting.

## Key Changes

- Productize generated actions with loading, error, empty, feedback, copy, citation-copy, and markdown-download controls.
- Keep action cards generated from `model_goal.generatedActions`; do not hardcode CA-only flows.
- Add Vitest and focused pure tests for planner behavior, import adapter selection, retrieval/citations, and Castform readiness blockers.
- Update README with setup, env vars, mock mode, provider mode, Castform mode, limitations, source-permission policy, and a 90-second demo script.
- Run final responsive/browser smoke checks without adding a large Playwright browser install requirement.

## Test Plan

```bash
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
```

Functional checks:

- `/`, `/projects/new`, `/projects/demo`, and one generated project return `200`.
- Create a project with mock mode and no provider keys; project builds and opens.
- Create a project with an uploaded `.md`; assistant answers cite uploaded chunks.
- Run a generated action; output has citations, copy, feedback, and markdown download controls.
- Create and refresh a mock Castform run; model version appears.
- Real Castform launch remains disabled/blocked without env vars.
- Download Castform ZIP and confirm it includes workspace files.
- Path traversal for artifact file download fails.
- Browser smoke at desktop, tablet, 390px, and 320px shows no horizontal overflow, clipped headings, or console errors.

## Assumptions

- Local JSON storage remains the source of truth.
- Mock mode remains the reliable baseline.
- Tests focus on deterministic server/domain logic.
- Browser verification uses available browser tooling; missing Playwright binaries should not force a repo dependency change.
