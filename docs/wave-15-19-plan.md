# Waves 15-19 Plan: Real Castform RAG Training With Supabase Jobs

## Summary

Waves 15-19 correct CastGenie’s product direction. The local RAG assistant is only a preview/staging layer. The real product path is:

```text
English intent -> real sources -> cleaned corpus -> Castform RAG project -> Supabase-backed training job -> Castform run -> hosted model chat
```

Use Supabase for durable metadata, job state, Castform run tracking, training events, and model versions. Keep large generated artifacts in `storage/projects/<projectId>` for the demo phase.

## Wave 15: Supabase Persistence And Job Runtime

- Add Supabase server-only persistence for project metadata, build jobs, source summaries, artifact manifests, Castform runs, training events, and model versions.
- Add SQL migrations under `supabase/migrations` so dashboard setup works now and Supabase CLI adoption stays clean later.
- Add env support for `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CASTGENIE_STORAGE_MODE=supabase`.
- Replace request-bound project builds with a local worker command that claims queued jobs and writes status back to Supabase.
- Preserve local JSON as an offline/test fallback only.

## Wave 16: Castform RAG Project Generator

- Replace generic Castform scaffolds with generated RAG project files:
  - `castform_project/src/env.py`
  - `castform_project/src/dataset.py`
  - `castform_project/src/tools.py`
  - `castform_project/src/rewards.py`
  - `castform_project/src/train.py`
  - `castform_project/config.yaml`
- Generate a domain-specific system prompt from the user’s English intent.
- Generate train/eval QA pairs from real uploaded or scraped corpus only.
- Generate validity-first reward logic for grounded answers, citations, refusal on weak evidence, and output-format compliance.
- Keep mock, fixture, and seed data available for preview but block them from real training readiness.

## Wave 17: Real Castform Launch, Monitoring, And Model Versions

- Replace the current generic runner with a production-shaped `benchmax` launcher.
- Validate Python 3.12, `benchmax`, `CASTFORM_API_KEY`, generated Castform project files, and training readiness before launch.
- Upload env/datasets with `upload_training_run`, then launch with `TrainerClient.launch_training_run`.
- Persist run id, status URL, launch args, corpus metadata, training events, and model version metadata in Supabase.
- Default launch args:
  - model: `Qwen/Qwen3.5-4B`
  - epochs: `5`
  - group size: `9`
  - LoRA rank: `128`
  - LoRA alpha: `256`
- Use hosted model name format `ft:<base-model>:<run-id>:latest` and endpoint `https://llm.castform.com/v1`.

## Wave 18: Product UX For Real Training And Hosted Chat

- Update workspace states to:
  - `Preparing sources`
  - `Training on Castform`
  - `Model ready`
  - `Training blocked`
- Main workspace shows only original user intent, training/model status, blockers, and the hosted-model chat when ready.
- Add a simplified training panel based on Castform’s app structure:
  - Overview
  - Train metrics/events
  - Eval summary
  - Playground/chat
  - Config
- Keep sources, datasets, files, and logs in advanced sections.
- Route normal chat/actions only to the hosted Castform model. Gemini/mock remains explicit preview/debug behavior only.

## Wave 19: Real Demo Hardening

- Prove the end-to-end demo:
  - create project from plain English
  - discover real sources with Exa
  - scrape with Firecrawl only when Exa content is insufficient
  - generate Castform RAG project
  - launch real Castform training when readiness passes
  - show Castform run URL/status
  - chat through hosted Castform model once available
- Add `pnpm demo:preflight`, `pnpm demo:local`, `pnpm demo:real`, and `pnpm demo:verify-hosted` so the demo path is repeatable and does not silently spend credits.
- Write redacted demo reports under ignored `storage/demo-runs/`.
- Add tests for redaction, paid-run gating, Exa allowed-domain permission handling, report shape, hosted model routing, and preview-vs-trained behavior.
- Update README to state the real product contract: CastGenie is a Castform project generator and launcher, not a local RAG chatbot. See `docs/wave-19-plan.md` and `docs/final-demo-runbook.md`.

## Credential Checklist

Put secrets in `.env.local`; never paste service-role or provider keys into chat.

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CASTGENIE_STORAGE_MODE=supabase

CASTFORM_API_KEY=
CASTFORM_REAL_RUNS_ENABLED=true
CASTFORM_AUTO_LAUNCH=true
CASTFORM_PYTHON_BIN=python3.12
CASTFORM_BASE_MODEL=Qwen/Qwen3.5-4B
CASTFORM_INFERENCE_BASE_URL=https://llm.castform.com/v1
CASTFORM_NUM_EPOCHS=5
CASTFORM_BASE_URL=

EXA_API_KEY=
FIRECRAWL_API_KEY=

GEMINI_API_KEY=
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-3.5-flash

MOCK_MODE=false
LLM_PROVIDER=gemini
```

## Assumptions

- Supabase dashboard credentials are acceptable immediately; Supabase CLI remains the long-term setup path.
- Supabase stores metadata/job state only in these waves. Large generated files remain local.
- RAG expert models are the first true trainable target.
- Real Castform credit spend remains gated by readiness checks plus `CASTFORM_AUTO_LAUNCH=true`.
- Unknown permissions, mock sources, fixture sources, login-only pages, paywalled pages, and PDF-only projects block real training.
