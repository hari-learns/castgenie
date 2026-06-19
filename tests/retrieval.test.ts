import { describe, expect, it } from "vitest"

import { retrieveChunks } from "@/lib/retrieval"
import type { ChunkRecord, SourceRecord } from "@/types/artifacts"

const sources: SourceRecord[] = [
  {
    id: "source_ca",
    title: "CA consolidation source",
    url: "seed://ca",
    provider: "seed",
    domain: "castgenie.local",
    fetchedAt: "2026-06-19T00:00:00.000Z",
    permissionStatus: "user_provided",
  },
]

const chunks: ChunkRecord[] = [
  {
    id: "chunk_goodwill",
    documentId: "doc_1",
    sourceId: "source_ca",
    title: "Goodwill and capital reserve",
    text: "Goodwill compares consideration and identifiable net assets at acquisition.",
    charStart: 0,
    charEnd: 80,
    keywords: ["goodwill", "acquisition"],
  },
  {
    id: "chunk_inventory",
    documentId: "doc_2",
    sourceId: "source_ca",
    title: "Inventory unrealized profit",
    text: "Unrealized profit in closing inventory is removed from group profit.",
    charStart: 0,
    charEnd: 70,
    keywords: ["inventory", "profit"],
  },
]

describe("retrieveChunks", () => {
  it("ranks matching title and keyword chunks first with citations", () => {
    const result = retrieveChunks({
      query: "Explain goodwill on acquisition",
      sources,
      chunks,
      maxChunks: 2,
    })

    expect(result.chunks).toHaveLength(1)
    expect(result.chunks[0].id).toBe("chunk_goodwill")
    expect(result.chunks[0].score).toBeGreaterThan(0)
    expect(result.chunks[0].citation).toMatchObject({
      sourceId: "source_ca",
      chunkId: "chunk_goodwill",
      url: "seed://ca",
    })
  })

  it("still returns chunks when matches are weak", () => {
    const result = retrieveChunks({
      query: "unrelated topic",
      sources,
      chunks,
      maxChunks: 1,
    })

    expect(result.chunks).toHaveLength(1)
    expect(result.summary).toContain("Retrieved 1 chunk")
  })
})
