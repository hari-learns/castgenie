export type WebProviderName = "mock" | "exa" | "firecrawl"

export type WebProviderTraceRecord = {
  provider: WebProviderName
  operation: "search" | "scrape" | "mock_fallback"
  status: "skipped" | "success" | "failed" | "fallback"
  startedAt: string
  finishedAt: string
  inputSummary: string
  outputSummary: string
  error?: string
}

export type WebSearchPlan = {
  projectId: string
  provider: WebProviderName
  queries: string[]
  allowedDomains: string[]
  contentMode: "highlights" | "text"
  maxResults: number
  generatedAt: string
  warnings: string[]
}

export type WebDiscoveryResult = {
  id: string
  query: string
  title: string
  url: string
  domain: string
  provider: "mock" | "exa"
  selected: boolean
  allowedDomainMatch: boolean
  permissionStatus: "allowed_public" | "unknown"
  text?: string
  summary?: string
  warning?: string
}

export type WebSearchResult = WebDiscoveryResult

export type WebDiscoveryReport = {
  projectId: string
  provider: "mock" | "exa"
  resultCount: number
  selectedCount: number
  skippedCount: number
  results: WebDiscoveryResult[]
  providerTrace: WebProviderTraceRecord[]
  warnings: string[]
  generatedAt: string
}

export type WebScrapeRecord = {
  resultId: string
  url: string
  provider: "mock" | "firecrawl" | "exa"
  status: "used_search_text" | "scraped" | "skipped" | "failed"
  markdownLength: number
  warning?: string
}

export type WebScrapeResult = WebScrapeRecord

export type WebScrapeReport = {
  projectId: string
  provider: WebProviderName
  scrapedCount: number
  usedSearchTextCount: number
  skippedCount: number
  failedCount: number
  records: WebScrapeRecord[]
  providerTrace: WebProviderTraceRecord[]
  warnings: string[]
  generatedAt: string
}
