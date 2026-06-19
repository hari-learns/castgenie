import type { ActionTemplate } from "@/types/actions"
import type { ChunkRecord, SourceRecord } from "@/types/artifacts"
import type { RetrievalResult, RetrievedChunk } from "@/types/traces"

type RetrieveInput = {
  query: string
  chunks: ChunkRecord[]
  sources: SourceRecord[]
  action?: ActionTemplate
  maxChunks?: number
}

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "give",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
])

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token))
}

function uniqueTokens(value: string) {
  return [...new Set(tokenize(value))]
}

function sourceById(sources: SourceRecord[]) {
  return new Map(sources.map((source) => [source.id, source]))
}

function scoreChunk(input: {
  chunk: ChunkRecord
  queryTokens: string[]
  actionTags: string[]
  query: string
}) {
  const chunkTitleTokens = uniqueTokens(input.chunk.title)
  const chunkTextTokens = uniqueTokens(input.chunk.text)
  const keywordTokens = input.chunk.keywords.map((keyword) => keyword.toLowerCase())
  const matchedTerms = new Set<string>()
  let score = 0

  for (const token of input.queryTokens) {
    if (chunkTitleTokens.includes(token)) {
      score += 5
      matchedTerms.add(token)
    }
    if (keywordTokens.includes(token)) {
      score += 4
      matchedTerms.add(token)
    }
    if (chunkTextTokens.includes(token)) {
      score += 2
      matchedTerms.add(token)
    }
  }

  for (const tag of input.actionTags) {
    const tagTokens = uniqueTokens(tag)
    if (
      tagTokens.some(
        (token) =>
          chunkTitleTokens.includes(token) ||
          keywordTokens.includes(token) ||
          chunkTextTokens.includes(token)
      )
    ) {
      score += 3
      matchedTerms.add(tag)
    }
  }

  if (input.query.toLowerCase().includes(input.chunk.title.toLowerCase())) {
    score += 8
  }

  return {
    score,
    matchedTerms: [...matchedTerms],
  }
}

export function retrieveChunks({
  query,
  chunks,
  sources,
  action,
  maxChunks,
}: RetrieveInput): RetrievalResult {
  const sourceMap = sourceById(sources)
  const queryTokens = uniqueTokens(query)
  const actionTags = action?.retrievalPolicy.requiredTags ?? []
  const limit = Math.max(1, Math.min(maxChunks ?? action?.retrievalPolicy.maxChunks ?? 6, 8))

  const ranked = chunks
    .map((chunk) => {
      const source = sourceMap.get(chunk.sourceId)
      const { score, matchedTerms } = scoreChunk({
        chunk,
        queryTokens,
        actionTags,
        query,
      })

      return {
        id: chunk.id,
        title: chunk.title,
        text: chunk.text,
        sourceId: chunk.sourceId,
        documentId: chunk.documentId,
        score,
        matchedTerms,
        citation: {
          sourceId: chunk.sourceId,
          chunkId: chunk.id,
          title: chunk.title,
          url: source?.url,
        },
      } satisfies RetrievedChunk
    })
    .toSorted((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  const positive = ranked.filter((chunk) => chunk.score > 0)
  const selected = (positive.length ? positive : ranked).slice(0, limit)

  return {
    query,
    summary: selected.length
      ? `Retrieved ${selected.length} chunk${selected.length === 1 ? "" : "s"} for source-grounded response.`
      : "No chunks were available for retrieval.",
    chunks: selected,
  }
}
