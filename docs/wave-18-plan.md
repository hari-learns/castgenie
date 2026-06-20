# Wave 18 Plan: Product UX For Real Training And Hosted Chat

## Summary

Wave 18 makes the project workspace honest and beginner-friendly after the real
Castform launch work in Wave 17. The default screen now presents the user’s
plain-English model brief, the current model lifecycle state, and the hosted
model chat surface. The main chat and workflows remain locked until a hosted
Castform model version exists.

## Key Changes

- Add a shared model lifecycle helper for `Preparing sources`, `Ready to train`,
  `Training on Castform`, `Model ready`, `Training blocked`, and `Preview only`.
- Rework the project workspace into a two-panel product view: model brief and
  status on the left, trained-model chat on the right.
- Hide the chat input while no hosted Castform model exists so the UI does not
  imply a local preview is the trained model.
- Improve the Training section with overview, readiness, runs, model versions,
  config, run URLs, provider job ids, validation report paths, and launch config
  paths.
- Keep Gemini/mock behavior labeled as preview/debug behavior only.

## Test Plan

Run:

```bash
pnpm lint
pnpm test
pnpm build
pnpm audit --audit-level moderate
pnpm supabase:smoke
```

Functional checks:

- `/projects/demo` opens and shows a clear no-hosted-model state.
- Main chat is hidden/locked until a hosted Castform model version exists.
- Training tab clearly shows readiness, runs, config, and model versions.
- Workflows remain locked until the hosted model exists.
- Preview/local responses are never labeled as the trained model.

## Assumptions

- No backend training behavior changes are included.
- No Supabase migration is required.
- No new provider integration is added.
- Wave 19 remains the end-to-end real demo hardening wave.
