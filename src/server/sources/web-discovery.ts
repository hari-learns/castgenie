import type { DomainImportKind } from "@/types/imports"
import type {
  WebDiscoveryReport,
  WebDiscoveryResult,
  WebProviderTraceRecord,
  WebScrapeRecord,
  WebScrapeReport,
  WebSearchPlan,
} from "@/types/web-sources"

type WebDiscoveryInput = {
  projectId: string
  prompt: string
  domainKind: DomainImportKind
  allowedDomains?: string
  maxSources: number
  mockMode: boolean
}

type WebDocument = {
  result: WebDiscoveryResult
  markdown: string
}

function now() {
  return new Date().toISOString()
}

function parseAllowedDomains(value?: string) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((domain) => domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean)
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "unknown"
  }
}

function domainMatches(domain: string, allowedDomains: string[]) {
  if (allowedDomains.length === 0) return false
  return allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}

function inferredAllowedDomains(input: WebDiscoveryInput) {
  const explicit = parseAllowedDomains(input.allowedDomains)
  const prompt = input.prompt.toLowerCase()

  if (explicit.length > 0) {
    return explicit
  }

  if (prompt.includes("sebi")) {
    return ["sebi.gov.in"]
  }

  return []
}

function needsFullTextContent(prompt: string) {
  const normalized = prompt.toLowerCase()
  return [
    "sebi",
    "lodr",
    "compliance officer",
    "regulation",
    "regulatory",
    "compliance",
    "policy",
    "law",
    "legal",
    "statute",
  ].some((term) => normalized.includes(term))
}

function relevantTextTerms(plan: WebSearchPlan, title: string) {
  const combined = `${title} ${plan.queries.join(" ")}`.toLowerCase()
  const terms = new Set<string>()

  if (combined.includes("sebi") || combined.includes("lodr")) {
    terms.add("regulation 6")
    terms.add("compliance officer")
    terms.add("obligations of compliance officer")
    terms.add("qualified company secretary")
    terms.add("listing obligations and disclosure requirements")
  }

  if (combined.includes("compliance")) {
    terms.add("non-compliance")
    terms.add("compliance")
  }

  return Array.from(terms)
}

function boundedSearchText(text: string, plan: WebSearchPlan, title: string) {
  const maxCharacters = 18000
  if (text.length <= maxCharacters) return text

  const normalized = text.toLowerCase()
  const terms = relevantTextTerms(plan, title)
  const windows: string[] = []
  const seenStarts = new Set<number>()

  for (const term of terms) {
    let index = normalized.indexOf(term)
    let guard = 0
    while (index !== -1 && guard < 5 && windows.join("\n\n").length < maxCharacters) {
      const start = Math.max(0, index - 2500)
      const end = Math.min(text.length, index + 4500)
      const bucket = Math.floor(start / 1000)
      if (!seenStarts.has(bucket)) {
        seenStarts.add(bucket)
        windows.push(text.slice(start, end).trim())
      }
      index = normalized.indexOf(term, index + term.length)
      guard += 1
    }
  }

  const body = windows.length > 0 ? windows.join("\n\n--- Relevant excerpt ---\n\n") : text.slice(0, maxCharacters)
  return `${body.slice(0, maxCharacters)}\n\n[Truncated by CastGenie local demo.]`
}

function queryPlan(input: WebDiscoveryInput): WebSearchPlan {
  const prompt = input.prompt.toLowerCase()
  const queries =
    input.domainKind === "ca_edtech"
      ? [
          `${input.prompt} syllabus official source`,
          `${input.prompt} exam question format official source`,
        ]
      : input.domainKind === "owasp_security"
        ? [
            `${input.prompt} OWASP official guide`,
            `${input.prompt} secure code checklist`,
          ]
        : prompt.includes("sebi")
          ? [
              "SEBI LODR Regulation 6 compliance officer qualification official pdf",
              "SEBI LODR Regulations 2015 official pdf regulation 6 compliance officer",
              "SEBI listing obligations disclosure requirements regulations official pdf",
            ]
          : prompt.includes("compliance") ||
              prompt.includes("regulation") ||
              prompt.includes("regulatory") ||
              prompt.includes("policy")
            ? [
                `${input.prompt} official regulator guidance`,
                `${input.prompt} compliance policy framework official`,
                `${input.prompt} regulatory checklist official source`,
              ]
        : [
            `${input.prompt} official guide`,
            `${input.prompt} reference documentation`,
          ]

  return {
    projectId: input.projectId,
    provider: input.mockMode || !process.env.EXA_API_KEY ? "mock" : "exa",
    queries: queries.slice(0, 3),
    allowedDomains: inferredAllowedDomains(input),
    contentMode: needsFullTextContent(input.prompt) ? "text" : "highlights",
    maxResults: Math.max(1, Math.min(input.maxSources, Number(process.env.MAX_SOURCES ?? 12))),
    generatedAt: now(),
    warnings: [],
  }
}

function mockResults(input: WebDiscoveryInput, plan: WebSearchPlan): WebDiscoveryResult[] {
  const fixtures =
    input.domainKind === "ca_edtech"
      ? [
          {
            title: "ICAI-style syllabus and lesson source pattern",
            url: "https://example.edu/ca-syllabus-pattern",
            text: "## Syllabus mapping\nLessons should map concepts to chapters, examples, mistakes, and exam outcomes.\n\n## Question pattern\nQuestions should include marks, topic coverage, answer format, and source-grounded explanations.",
          },
          {
            title: "CA exam practice generation reference",
            url: "https://example.edu/ca-practice-reference",
            text: "## Practice design\nUseful practice sets balance direct concept checks, application problems, and answer keys.\n\n## Quality rule\nPast-paper-like generation should copy structure, not copyrighted questions.",
          },
        ]
      : input.domainKind === "owasp_security"
        ? [
            {
              title: "OWASP review workflow public reference",
              url: "https://owasp.org/www-project-top-ten/",
              text: "## Security source pattern\nReview inputs, trust boundaries, sinks, authentication, authorization, and output encoding.\n\n## Evidence rule\nDo not claim exploitability without code or source evidence.",
            },
            {
              title: "Secure remediation checklist source",
              url: "https://owasp.org/www-project-cheat-sheets/",
              text: "## Remediation pattern\nFindings should include risk, affected path, preconditions, fix guidance, and regression tests.\n\n## Checklist\nUse parameterized APIs, central authorization, least privilege, and output encoding.",
            },
          ]
        : [
            {
              title: "Public domain model grounding guide",
              url: "https://example.com/domain-grounding-guide",
              text: "## Source grounding\nA domain assistant should answer from provided material, cite evidence, and expose uncertainty.\n\n## Dataset workflow\nIngest sources, chunk the corpus, create QA rows, eval rows, and action tasks.",
            },
            {
              title: "Public expert assistant action guide",
              url: "https://example.com/expert-action-guide",
              text: "## Action design\nActions should match the user's workflow and produce structured outputs.\n\n## Safety\nAvoid unsupported claims when source evidence is weak.",
            },
          ]

  return fixtures.slice(0, plan.maxResults).map((fixture, index) => {
    const domain = domainFromUrl(fixture.url)
    const allowedDomainMatch = domainMatches(domain, plan.allowedDomains)

    return {
      id: `web_result_${String(index + 1).padStart(3, "0")}`,
      query: plan.queries[index % plan.queries.length],
      title: fixture.title,
      url: fixture.url,
      domain,
      provider: "mock",
      selected: true,
      allowedDomainMatch,
      permissionStatus: "allowed_public",
      text: fixture.text,
    }
  })
}

async function exaResults(plan: WebSearchPlan): Promise<WebDiscoveryResult[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) return []

  const results: WebDiscoveryResult[] = []
  const contents =
    plan.contentMode === "text"
      ? {
          text: true,
        }
      : {
          highlights: true,
        }

  for (const query of plan.queries) {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "auto",
        includeDomains: plan.allowedDomains.length ? plan.allowedDomains : undefined,
        numResults: Math.min(plan.maxResults, 10),
        contents,
      }),
    })

    if (!response.ok) {
      throw new Error(`Exa search failed with ${response.status}`)
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: string
        url?: string
        highlights?: string[]
        text?: string
      }>
    }

    for (const item of payload.results ?? []) {
      if (!item.url || results.some((result) => result.url === item.url)) continue
      const domain = domainFromUrl(item.url)
      const allowedDomainMatch = domainMatches(domain, plan.allowedDomains)
      const text = item.text?.trim()
      const highlights = item.highlights?.join("\n\n").trim()
      const extractedText = text || highlights
      const boundedText = extractedText ? boundedSearchText(extractedText, plan, item.title || item.url) : extractedText
      results.push({
        id: `web_result_${String(results.length + 1).padStart(3, "0")}`,
        query,
        title: item.title || item.url,
        url: item.url,
        domain,
        provider: "exa",
        selected: allowedDomainMatch || plan.allowedDomains.length === 0,
        allowedDomainMatch,
        permissionStatus: allowedDomainMatch ? "allowed_public" : "unknown",
        text: boundedText,
        warning: allowedDomainMatch
          ? undefined
          : "Domain was not explicitly allow-listed; review permission before training.",
      })
    }
  }

  return results.slice(0, plan.maxResults)
}

async function firecrawlMarkdown(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 20000,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Firecrawl scrape failed with ${response.status}`)
    }

    const payload = (await response.json()) as {
      success?: boolean
      data?: { markdown?: string }
    }

    return payload.data?.markdown?.trim() || null
  } finally {
    clearTimeout(timeout)
  }
}

export async function runWebDiscovery(input: WebDiscoveryInput): Promise<{
  plan: WebSearchPlan
  discovery: WebDiscoveryReport
  scrape: WebScrapeReport
  documents: WebDocument[]
}> {
  const plan = queryPlan(input)
  const warnings: string[] = []
  const providerTrace: WebProviderTraceRecord[] = []
  let results: WebDiscoveryResult[]

  if (plan.provider === "mock") {
    const startedAt = now()
    results = mockResults(input, plan)
    providerTrace.push({
      provider: "mock",
      operation: "search",
      status: "success",
      startedAt,
      finishedAt: now(),
      inputSummary: `${plan.queries.length} mock search queries`,
      outputSummary: `${results.length} mock results`,
    })
    warnings.push("Mock web discovery used because MOCK_MODE is enabled or EXA_API_KEY is absent.")
  } else {
    const startedAt = now()
    try {
      results = await exaResults(plan)
      providerTrace.push({
        provider: "exa",
        operation: "search",
        status: "success",
        startedAt,
        finishedAt: now(),
        inputSummary: `${plan.queries.length} Exa search queries`,
        outputSummary: `${results.length} Exa results`,
      })
    } catch (error) {
      results = mockResults(input, { ...plan, provider: "mock" })
      providerTrace.push({
        provider: "exa",
        operation: "search",
        status: "failed",
        startedAt,
        finishedAt: now(),
        inputSummary: `${plan.queries.length} Exa search queries`,
        outputSummary: "0 Exa results",
        error: error instanceof Error ? error.message : "Unknown provider error.",
      })
      providerTrace.push({
        provider: "mock",
        operation: "mock_fallback",
        status: "fallback",
        startedAt: now(),
        finishedAt: now(),
        inputSummary: "Exa search fallback",
        outputSummary: `${results.length} mock results`,
      })
      warnings.push(
        `Exa unavailable; fell back to mock web discovery. ${
          error instanceof Error ? error.message : "Unknown provider error."
        }`
      )
    }
  }

  const selected = results.filter((result) => result.selected).slice(0, plan.maxResults)
  const documents: WebDocument[] = []
  const scrapeRecords: WebScrapeRecord[] = []

  for (const result of selected) {
    if (result.text && result.text.trim().length > 80) {
      documents.push({ result, markdown: result.text.trim() })
      scrapeRecords.push({
        resultId: result.id,
        url: result.url,
        provider: result.provider,
        status: "used_search_text",
        markdownLength: result.text.trim().length,
      })
      continue
    }

    try {
      const startedAt = now()
      const markdown = await firecrawlMarkdown(result.url)
      if (markdown) {
        providerTrace.push({
          provider: "firecrawl",
          operation: "scrape",
          status: "success",
          startedAt,
          finishedAt: now(),
          inputSummary: result.url,
          outputSummary: `${markdown.length} markdown characters`,
        })
        documents.push({ result, markdown })
        scrapeRecords.push({
          resultId: result.id,
          url: result.url,
          provider: "firecrawl",
          status: "scraped",
          markdownLength: markdown.length,
        })
      } else {
        providerTrace.push({
          provider: "firecrawl",
          operation: "scrape",
          status: "skipped",
          startedAt,
          finishedAt: now(),
          inputSummary: result.url,
          outputSummary: "No Firecrawl key or no markdown returned",
        })
        scrapeRecords.push({
          resultId: result.id,
          url: result.url,
          provider: "firecrawl",
          status: "skipped",
          markdownLength: 0,
          warning: "No search text was available and Firecrawl was not configured.",
        })
      }
    } catch (error) {
      providerTrace.push({
        provider: "firecrawl",
        operation: "scrape",
        status: "failed",
        startedAt: now(),
        finishedAt: now(),
        inputSummary: result.url,
        outputSummary: "0 markdown characters",
        error: error instanceof Error ? error.message : "Unknown scrape error.",
      })
      scrapeRecords.push({
        resultId: result.id,
        url: result.url,
        provider: "firecrawl",
        status: "failed",
        markdownLength: 0,
        warning: error instanceof Error ? error.message : "Unknown scrape error.",
      })
    }
  }

  if (documents.length === 0 && plan.provider !== "mock") {
    const mockPlan = { ...plan, provider: "mock" as const }
    const mockSelected = mockResults(input, mockPlan)
    const fallbackTrace: WebProviderTraceRecord = {
      provider: "mock",
      operation: "mock_fallback",
      status: "fallback",
      startedAt: now(),
      finishedAt: now(),
      inputSummary: "No usable real web documents",
      outputSummary: `${mockSelected.length} mock documents`,
    }
    warnings.push("Real web providers returned no usable text; fell back to mock web fixtures.")

    return {
      plan: { ...mockPlan, warnings },
      discovery: {
        projectId: input.projectId,
        provider: "mock",
        resultCount: mockSelected.length,
        selectedCount: mockSelected.length,
        skippedCount: 0,
        results: mockSelected,
        providerTrace: [...providerTrace, fallbackTrace],
        warnings,
        generatedAt: now(),
      },
      scrape: {
        projectId: input.projectId,
        provider: "mock",
        scrapedCount: 0,
        usedSearchTextCount: mockSelected.length,
        skippedCount: 0,
        failedCount: 0,
        records: mockSelected.map((result) => ({
          resultId: result.id,
          url: result.url,
          provider: "mock",
          status: "used_search_text",
          markdownLength: result.text?.length ?? 0,
        })),
        providerTrace: [...providerTrace, fallbackTrace],
        warnings,
        generatedAt: now(),
      },
      documents: mockSelected.map((result) => ({
        result,
        markdown: result.text ?? "",
      })),
    }
  }

  const scrapeWarnings = scrapeRecords.flatMap((record) => record.warning ? [record.warning] : [])

  return {
    plan: { ...plan, warnings },
    discovery: {
      projectId: input.projectId,
      provider: results[0]?.provider ?? plan.provider,
      resultCount: results.length,
      selectedCount: selected.length,
      skippedCount: results.filter((result) => !result.selected).length,
      results,
      providerTrace,
      warnings,
      generatedAt: now(),
    },
    scrape: {
      projectId: input.projectId,
      provider: scrapeRecords.some((record) => record.provider === "firecrawl")
        ? "firecrawl"
        : results[0]?.provider ?? plan.provider,
      scrapedCount: scrapeRecords.filter((record) => record.status === "scraped").length,
      usedSearchTextCount: scrapeRecords.filter((record) => record.status === "used_search_text").length,
      skippedCount: scrapeRecords.filter((record) => record.status === "skipped").length,
      failedCount: scrapeRecords.filter((record) => record.status === "failed").length,
      records: scrapeRecords,
      providerTrace,
      warnings: [...new Set([...warnings, ...scrapeWarnings])],
      generatedAt: now(),
    },
    documents,
  }
}
