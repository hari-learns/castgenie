# Wave 8 Plan: Automatic Web Discovery And Scrape Import

## Summary

Implement Wave 8 as CastGenie’s first automatic public-source discovery layer. After Wave 7, users can upload source files. Wave 8 lets the backend infer search needs from the English model intent, discover public web sources, extract usable markdown, and feed those sources into the existing local JSON pipeline, RAG assistant, artifacts, and Castform export.

Mock mode remains the reliability baseline. Real Exa and Firecrawl calls are optional enhancements behind env vars.

## Provider References

Use provider contracts only, no SDK dependency in Wave 8.

### Exa Search

Canonical reference: https://docs.exa.ai/reference/search-api-guide-for-coding-agents

- Endpoint: `POST /search`
- Base URL: `https://api.exa.ai`
- Auth: `x-api-key`
- Inputs: query, `type`, `includeDomains`, `numResults`, content options
- Default Wave 8 search type: `auto`
- Default Wave 8 content mode: `contents.highlights=true`
- Output: ranked web results with title, URL, and highlights/snippet content when available

Default request shape:

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

### Firecrawl Scrape

- Endpoint: `POST /v2/scrape`
- Base URL: `https://api.firecrawl.dev`
- Auth: Bearer token
- Input: URL, output format
- Output: markdown when available

## Key Changes

- Add web discovery contracts:
  - `WebSearchPlan`
  - `WebSearchResult`
  - `WebScrapeResult`
  - `WebDiscoveryReport`
  - provider trace records for mock/Exa/Firecrawl calls.

- Add provider adapters:
  - mock web discovery provider, always available
  - Exa provider, used only when `MOCK_MODE=false` and `EXA_API_KEY` exists
  - Firecrawl scraper, used only when `MOCK_MODE=false` and `FIRECRAWL_API_KEY` exists
  - graceful fallback to mock/no-scrape when providers fail.

- Integrate into import pipeline:
  - Uploaded parseable files remain highest priority.
  - If no uploaded parseable files exist, run web discovery before CA/security/generic synthetic fallback.
  - Convert discovered/scraped markdown into existing `SourceRecord`, `DocumentRecord`, chunks, datasets, actions, reward spec, and Castform export.
  - Preserve URL, provider, fetchedAt, permission status, scrape status, and warnings.

- Add artifacts:
  - `imports/web_search_plan.json`
  - `imports/web_discovery.json`
  - `imports/web_scrape_report.json`
  - discovered source documents under existing `documents/`
  - all generated data continues through `source_manifest.json`, `chunks.jsonl`, datasets, rewards, and `castform_project/`.

- Update UI:
  - Sources tab shows web discovery summary, provider used, query, allowed domains, discovered URLs, scraped/skipped status, and warnings.
  - Artifact browser previews web discovery artifacts.
  - New project form keeps allowed domains and max sources meaningful for web discovery.

## Rules

- Never scrape login-only, paywalled, or obviously restricted sources.
- Do not treat unknown web permissions as licensed.
- Real provider calls must never run in `MOCK_MODE=true`.
- App must work with no Exa or Firecrawl keys.
- Do not add LangChain, MCP, or provider SDKs in Wave 8.
- Keep local JSON as source of truth.

## Test Plan

Run:

```bash
pnpm lint
pnpm build
pnpm audit --audit-level moderate
```
