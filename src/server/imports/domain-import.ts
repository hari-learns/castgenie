import caFixture from "@/server/imports/fixtures/wire-neurons-ca-fixture.json"
import { parseUploadedDocuments } from "@/server/sources/source-intake"
import { runWebDiscovery } from "@/server/sources/web-discovery"
import type { ChunkRecord, DocumentRecord, QAPair, SourceRecord } from "@/types/artifacts"
import type {
  AdapterTraceRecord,
  DomainGraphNode,
  DomainImportAdapter,
  ImportedDomainBundle,
  ImportInput,
  ImportSourceStrategy,
  ImportSummary,
  PermissionRecord,
  QualityTagRecord,
} from "@/types/imports"

type FixtureChapter = {
  id: string
  name: string
  pdf_url: string
  unit_number: number
  paper_number: number
  paper_name: string
  status: string
  content_profile: {
    topics: string[]
    sub_topics: string[]
    key_concepts: string[]
    methods_formulae: string[]
    icai_treatment: string
  }
}

type FixtureQuestion = {
  q: string
  marks: number
  type: string
  text: string
  concepts: string[]
  answer_format: string
  answer_summary: string
}

type FixturePaper = {
  meta: {
    attempt: string
    subject: string
    paper_number: number
    source_url: string
    label: string
  }
  questions: FixtureQuestion[]
}

type FixtureData = {
  syllabus: {
    exam: string
    version: string
    source_url: string
    papers: Array<{
      number: number
      name: string
      group: number
      chapters: Array<{
        id: string
        name: string
        unit_number: number
        pdf_url: string
      }>
    }>
  }
  enriched_chapters: Record<string, FixtureChapter>
  papers: FixturePaper[]
  quality_tags: QualityTagRecord[]
}

type SourceDocumentSeed = {
  sourceId: string
  documentId: string
  title: string
  url: string
  provider: SourceRecord["provider"]
  domain: string
  permissionStatus: SourceRecord["permissionStatus"]
  notes: string
  text: string
}

const fixture = caFixture as FixtureData

function now() {
  return new Date().toISOString()
}

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

function makeSource(seed: SourceDocumentSeed): SourceRecord {
  return {
    id: seed.sourceId,
    title: seed.title,
    url: seed.url,
    provider: seed.provider,
    domain: seed.domain,
    fetchedAt: now(),
    permissionStatus: seed.permissionStatus,
    notes: seed.notes,
  }
}

function makeDocument(projectId: string, seed: SourceDocumentSeed, index: number): DocumentRecord {
  const padded = String(index + 1).padStart(3, "0")
  const text = `# ${seed.title}\n\n${seed.text}`

  return {
    id: seed.documentId,
    sourceId: seed.sourceId,
    title: seed.title,
    text,
    markdownPath: `documents/${projectId}_${padded}.md`,
    tokenEstimate: estimateTokens(text),
  }
}

function countPermissions(sources: SourceRecord[]) {
  return sources.reduce<ImportSummary["permissionCounts"]>((counts, source) => {
    counts[source.permissionStatus] = (counts[source.permissionStatus] ?? 0) + 1
    return counts
  }, {})
}

function makeSummary(input: {
  adapterId: string
  adapterLabel: string
  strategy: ImportSourceStrategy
  sources: SourceRecord[]
  documents: DocumentRecord[]
  chapterCount: number
  topicCount: number
  questionCount: number
  warnings: string[]
}): ImportSummary {
  return {
    adapterId: input.adapterId,
    adapterLabel: input.adapterLabel,
    strategy: input.strategy,
    sourceCount: input.sources.length,
    documentCount: input.documents.length,
    chapterCount: input.chapterCount,
    topicCount: input.topicCount,
    questionCount: input.questionCount,
    permissionCounts: countPermissions(input.sources),
    warnings: input.warnings,
  }
}

function permissionsFromSources(sources: SourceRecord[], note: string): PermissionRecord[] {
  return sources.map((source) => ({
    sourceId: source.id,
    status: source.permissionStatus,
    note,
  }))
}

function makeBundle(input: {
  adapter: DomainImportAdapter
  projectId: string
  strategy: ImportSourceStrategy
  seeds: SourceDocumentSeed[]
  domainGraph: DomainGraphNode[]
  questions: QAPair[]
  qualityTags: QualityTagRecord[]
  trace: AdapterTraceRecord[]
  chapterCount: number
  topicCount: number
  warnings: string[]
  permissionNote: string
  chunks?: ChunkRecord[]
  uploadParseReport?: ImportedDomainBundle["uploadParseReport"]
  webSearchPlan?: ImportedDomainBundle["webSearchPlan"]
  webDiscovery?: ImportedDomainBundle["webDiscovery"]
  webScrapeReport?: ImportedDomainBundle["webScrapeReport"]
}): ImportedDomainBundle {
  const sources = input.seeds.map(makeSource)
  const documents = input.seeds.map((seed, index) => makeDocument(input.projectId, seed, index))
  const summary = makeSummary({
    adapterId: input.adapter.id,
    adapterLabel: input.adapter.label,
    strategy: input.strategy,
    sources,
    documents,
    chapterCount: input.chapterCount,
    topicCount: input.topicCount,
    questionCount: input.questions.length,
    warnings: input.warnings,
  })

  return {
    adapterId: input.adapter.id,
    summary,
    sources,
    documents,
    chunks: input.chunks,
    domainGraph: input.domainGraph,
    questions: input.questions,
    permissions: permissionsFromSources(sources, input.permissionNote),
    qualityTags: input.qualityTags,
    adapterTrace: input.trace,
    uploadParseReport: input.uploadParseReport,
    webSearchPlan: input.webSearchPlan,
    webDiscovery: input.webDiscovery,
    webScrapeReport: input.webScrapeReport,
  }
}

function syntheticSeeds(domainKind: ImportInput["domainKind"]): SourceDocumentSeed[] {
  if (domainKind === "owasp_security") {
    return [
      {
        sourceId: "source_001",
        documentId: "doc_001",
        title: "OWASP-oriented code review workflow",
        url: "seed://owasp/code-review-workflow",
        provider: "seed",
        domain: "castgenie.local",
        permissionStatus: "user_provided",
        notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
        text: "## Key concepts\nA security model needs evidence from code, framework behavior, and known vulnerability classes.\n\n## Review pattern\nIdentify inputs, trust boundaries, sinks, authentication checks, authorization checks, and output encoding.\n\n## Common mistakes\nDo not claim exploitability without code evidence. Distinguish suspected risk from confirmed vulnerability.",
      },
      {
        sourceId: "source_002",
        documentId: "doc_002",
        title: "Injection and broken access control examples",
        url: "seed://owasp/injection-access-control",
        provider: "seed",
        domain: "castgenie.local",
        permissionStatus: "user_provided",
        notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
        text: "## Key concepts\nInjection appears when untrusted input reaches interpreters without parameterization. Broken access control appears when object-level authorization is missing.\n\n## Fix pattern\nUse parameterized APIs, centralized authorization checks, least privilege, and regression tests.\n\n## Common mistakes\nA route-level login check is not the same as object-level authorization.",
      },
      {
        sourceId: "source_003",
        documentId: "doc_003",
        title: "Secure remediation explanation format",
        url: "seed://owasp/remediation-format",
        provider: "seed",
        domain: "castgenie.local",
        permissionStatus: "user_provided",
        notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
        text: "## Key concepts\nA useful security assistant should explain risk, affected code path, severity, reproduction preconditions, and concrete fix.\n\n## Output pattern\nSummarize finding, cite code/source context, explain impact, propose patch, and include a test case.\n\n## Common mistakes\nAvoid generic security advice that is not tied to the inspected codebase.",
      },
    ]
  }

  if (domainKind === "ca_edtech") {
    return [
      {
        sourceId: "source_001",
        documentId: "doc_001",
        title: "CA lesson generation from syllabus nodes",
        url: "seed://ca/lesson-generation",
        provider: "seed",
        domain: "castgenie.local",
        permissionStatus: "user_provided",
        notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
        text: "## Key concepts\nAn ed-tech model should map lessons to syllabus nodes, concepts, examples, and exam-style outcomes.\n\n## Lesson pattern\nStart with the concept, give a plain explanation, show a worked example, call out a common mistake, and end with practice.\n\n## Common mistakes\nLessons should not drift away from the source syllabus or invent authoritative rules without citations.",
      },
      {
        sourceId: "source_002",
        documentId: "doc_002",
        title: "Question paper and MCQ generation",
        url: "seed://ca/question-generation",
        provider: "seed",
        domain: "castgenie.local",
        permissionStatus: "user_provided",
        notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
        text: "## Key concepts\nQuestion generation should balance marks, difficulty, topic coverage, and answer format.\n\n## Paper pattern\nCreate sections, marks, question type, expected answer outline, and concept tags.\n\n## Common mistakes\nPast-paper-like does not mean copying past papers. Generate similar structure from licensed or user-provided patterns.",
      },
    ]
  }

  return [
    {
      sourceId: "source_001",
      documentId: "doc_001",
      title: "Custom expert model source grounding",
      url: "seed://generic/source-grounding",
      provider: "seed",
      domain: "castgenie.local",
      permissionStatus: "user_provided",
      notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
      text: "## Key concepts\nA domain model should answer from provided material, expose its uncertainty, and cite relevant source chunks.\n\n## Workflow\nPlan the domain, ingest source material, chunk the corpus, generate train and eval rows, then expose useful actions.\n\n## Common mistakes\nDo not treat a vague prompt as permission to invent unsupported facts.",
    },
    {
      sourceId: "source_002",
      documentId: "doc_002",
      title: "Custom domain action generation",
      url: "seed://generic/action-generation",
      provider: "seed",
      domain: "castgenie.local",
      permissionStatus: "user_provided",
      notes: "Synthetic Wave 4 fallback data. Replace with user-provided or licensed sources before production training.",
      text: "## Key concepts\nActions should reflect the user's intended workflow rather than generic chat only.\n\n## Workflow\nDerive action templates from the target user, capability list, and source material.\n\n## Common mistakes\nDo not hardcode CA-specific actions into unrelated domains.",
    },
  ]
}

function genericGraph(domainKind: ImportInput["domainKind"], seeds: SourceDocumentSeed[]): DomainGraphNode[] {
  return seeds.map((seed): DomainGraphNode => ({
    id: `source-node-${seed.sourceId}`,
    kind: domainKind === "owasp_security" ? "code_area" : "topic",
    title: seed.title,
    parentId: "domain-root",
    tags: [domainKind, seed.provider],
    metadata: {
      sourceId: seed.sourceId,
      provider: seed.provider,
    },
  }))
}

const syntheticSeedAdapter: DomainImportAdapter = {
  id: "synthetic-seed",
  label: "Synthetic seed adapter",
  strategy: "synthetic_seed",
  async detect() {
    return true
  },
  async import(input, trace) {
    const seeds = syntheticSeeds(input.domainKind)
    return makeBundle({
      adapter: syntheticSeedAdapter,
      projectId: input.projectId,
      strategy: "synthetic_seed",
      seeds,
      domainGraph: genericGraph(input.domainKind, seeds),
      questions: [],
      qualityTags: [],
      trace,
      chapterCount: 0,
      topicCount: seeds.length,
      warnings: ["Synthetic fallback used because no richer import adapter matched."],
      permissionNote: "Synthetic prototype data; replace before production training.",
    })
  },
}

const wireNeuronsFixtureAdapter: DomainImportAdapter = {
  id: "wire-neurons-ca-fixture",
  label: "Wire-Neurons-shaped CA fixture adapter",
  strategy: "wire_neurons_fixture",
  async detect(input) {
    return input.mockMode && input.domainKind === "ca_edtech"
  },
  async import(input, trace) {
    const chapters = Object.values(fixture.enriched_chapters)
    const seeds: SourceDocumentSeed[] = [
      {
        sourceId: "source_ca_syllabus",
        documentId: "doc_ca_syllabus",
        title: `${fixture.syllabus.exam} syllabus fixture`,
        url: fixture.syllabus.source_url,
        provider: "wire_neurons",
        domain: "castgenie.fixture",
        permissionStatus: "user_provided",
        notes: "Synthetic fixture shaped like Wire Neurons output. No Wire Neurons data is copied or read.",
        text: [
          "## Syllabus profile",
          `Exam: ${fixture.syllabus.exam}`,
          `Version: ${fixture.syllabus.version}`,
          "",
          "## Papers and chapters",
          ...fixture.syllabus.papers.flatMap((paper) => [
            `${paper.number}. ${paper.name} (Group ${paper.group})`,
            ...paper.chapters.map((chapter) => `- ${chapter.id}: ${chapter.name}`),
          ]),
        ].join("\n"),
      },
      ...chapters.map((chapter): SourceDocumentSeed => ({
        sourceId: `source_${chapter.id}`,
        documentId: `doc_${chapter.id}`,
        title: `${chapter.paper_name}: ${chapter.name}`,
        url: chapter.pdf_url,
        provider: "wire_neurons",
        domain: "castgenie.fixture",
        permissionStatus: "user_provided",
        notes: "Synthetic fixture shaped like enriched CA chapter output.",
        text: [
          "## Chapter profile",
          `Paper: ${chapter.paper_name}`,
          `Status: ${chapter.status}`,
          "",
          "## Topics",
          chapter.content_profile.topics.join(", "),
          "",
          "## Key concepts",
          chapter.content_profile.key_concepts.join(", "),
          "",
          "## Methods and formulae",
          chapter.content_profile.methods_formulae.join(", "),
          "",
          "## ICAI treatment",
          chapter.content_profile.icai_treatment,
        ].join("\n"),
      })),
      ...fixture.papers.map((paper): SourceDocumentSeed => ({
        sourceId: `source_paper_${paper.meta.label}`,
        documentId: `doc_paper_${paper.meta.label}`,
        title: `${paper.meta.attempt} ${paper.meta.subject} question fixture`,
        url: paper.meta.source_url,
        provider: "wire_neurons",
        domain: "castgenie.fixture",
        permissionStatus: "user_provided",
        notes: "Synthetic fixture shaped like extracted CA paper JSON.",
        text: [
          "## Paper metadata",
          `Subject: ${paper.meta.subject}`,
          `Attempt: ${paper.meta.attempt}`,
          "",
          "## Extracted questions",
          ...paper.questions.map(
            (question) =>
              `${question.q} (${question.marks} marks, ${question.type}): ${question.text}\nConcepts: ${question.concepts.join(", ")}\nExpected answer: ${question.answer_summary}`
          ),
        ].join("\n\n"),
      })),
    ]

    const questions = fixture.papers.flatMap((paper, paperIndex) =>
      paper.questions.map((question, questionIndex): QAPair => ({
        id: `fixture_train_${paperIndex + 1}_${questionIndex + 1}`,
        type: "train",
        topic: `${paper.meta.subject}: ${question.concepts.join(", ")}`,
        question: question.text,
        expectedAnswer: question.answer_summary,
        sourceIds: [`source_paper_${paper.meta.label}`],
        chunkIds: [],
        difficulty: question.marks >= 7 ? "hard" : question.marks >= 6 ? "medium" : "easy",
      }))
    )

    const domainGraph: DomainGraphNode[] = [
      ...fixture.syllabus.papers.map((paper): DomainGraphNode => ({
        id: `paper-${paper.number}`,
        kind: "paper",
        title: paper.name,
        parentId: "domain-root",
        tags: ["ca", "fixture", `group-${paper.group}`],
        metadata: {
          paperNumber: paper.number,
          chapterCount: paper.chapters.length,
        },
      })),
      ...chapters.map((chapter): DomainGraphNode => ({
        id: chapter.id,
        kind: "chapter",
        title: chapter.name,
        parentId: `paper-${chapter.paper_number}`,
        tags: ["ca", chapter.paper_name.toLowerCase().replace(/\s+/g, "-")],
        metadata: {
          sourceId: `source_${chapter.id}`,
          paperNumber: chapter.paper_number,
          unitNumber: chapter.unit_number,
        },
      })),
      ...chapters.flatMap((chapter) =>
        chapter.content_profile.topics.map((topic, index): DomainGraphNode => ({
          id: `${chapter.id}-topic-${index + 1}`,
          kind: "topic",
          title: topic,
          parentId: chapter.id,
          tags: chapter.content_profile.key_concepts.slice(0, 3),
        }))
      ),
    ]

    return makeBundle({
      adapter: wireNeuronsFixtureAdapter,
      projectId: input.projectId,
      strategy: "wire_neurons_fixture",
      seeds: seeds.slice(0, input.limits.maxSources),
      domainGraph,
      questions: questions.slice(0, input.limits.maxQaPairs),
      qualityTags: fixture.quality_tags,
      trace,
      chapterCount: chapters.length,
      topicCount: chapters.reduce(
        (count, chapter) => count + chapter.content_profile.topics.length,
        0
      ),
      warnings: [
        "Fixture data is synthetic and only mirrors Wire Neurons JSON shapes.",
        "No files are read from the private Wire Neurons project.",
      ],
      permissionNote: "Synthetic CA fixture data; not licensed study material.",
    })
  },
}

const codebasePlaceholderAdapter: DomainImportAdapter = {
  id: "codebase-placeholder",
  label: "Codebase/security placeholder adapter",
  strategy: "codebase_placeholder",
  async detect(input) {
    return input.domainKind === "owasp_security"
  },
  async import(input, trace) {
    const seeds = syntheticSeeds("owasp_security").map((seed) => ({
      ...seed,
      provider: "codebase" as const,
      url: seed.url.replace("seed://", "placeholder://"),
      notes: "Wave 4 placeholder for future codebase import. No repository code is scanned yet.",
    }))

    return makeBundle({
      adapter: codebasePlaceholderAdapter,
      projectId: input.projectId,
      strategy: "codebase_placeholder",
      seeds,
      domainGraph: genericGraph("owasp_security", seeds),
      questions: [],
      qualityTags: [
        {
          nodeId: "source-node-source_001",
          domain: "OWASP",
          tags: ["security", "code-review", "placeholder"],
        },
      ],
      trace,
      chapterCount: 0,
      topicCount: seeds.length,
      warnings: ["Codebase import is a placeholder in Wave 4; no source code is read."],
      permissionNote: "No codebase was ingested. Placeholder records are safe for mock mode.",
    })
  },
}

const localJsonFolderAdapter: DomainImportAdapter = {
  id: "local-json-folder",
  label: "Local JSON folder adapter scaffold",
  strategy: "local_json_folder",
  async detect(input) {
    return input.sourceStrategy === "local_json_folder" && Boolean(input.localFolderPath)
  },
  async import(input, trace) {
    const fallback = await syntheticSeedAdapter.import(input, trace)
    return {
      ...fallback,
      adapterId: localJsonFolderAdapter.id,
      summary: {
        ...fallback.summary,
        adapterId: localJsonFolderAdapter.id,
        adapterLabel: localJsonFolderAdapter.label,
        strategy: "local_json_folder",
        warnings: [
          "Local JSON folder import is scaffolded but disabled in Wave 4.",
          ...fallback.summary.warnings,
        ],
      },
    }
  },
}

const uploadPlaceholderAdapter: DomainImportAdapter = {
  id: "uploaded-file",
  label: "Uploaded file adapter",
  strategy: "uploaded_file",
  async detect(input) {
    const uploaded = await parseUploadedDocuments(input.projectId)
    return uploaded.documents.length > 0
  },
  async import(input, trace) {
    const uploaded = await parseUploadedDocuments(input.projectId)
    const seeds: SourceDocumentSeed[] = uploaded.documents.map((document, index) => ({
      sourceId: `upload_source_${String(index + 1).padStart(3, "0")}`,
      documentId: `upload_doc_${String(index + 1).padStart(3, "0")}`,
      title: document.title,
      url: `upload://${document.upload.storedName}`,
      provider: "user_upload",
      domain: uploaded.manifest?.sourceConfig.allowedDomains || "user-provided",
      permissionStatus: uploaded.manifest?.sourceConfig.permissionAttested
        ? "user_provided"
        : "unknown",
      notes: [
        `Uploaded file: ${document.upload.originalName}`,
        `Stored path: ${document.upload.relativePath}`,
        uploaded.manifest?.sourceConfig.permissionAttested
          ? "User attested source rights at upload time."
          : "No upload permission attestation recorded.",
      ].join(" "),
      text: document.text,
    }))

    return makeBundle({
      adapter: uploadPlaceholderAdapter,
      projectId: input.projectId,
      strategy: "uploaded_file",
      seeds: seeds.slice(0, input.limits.maxSources),
      domainGraph: genericGraph(input.domainKind, seeds),
      questions: [],
      qualityTags: seeds.map((seed) => ({
        nodeId: `source-node-${seed.sourceId}`,
        domain: input.domainKind,
        tags: ["uploaded", seed.provider, seed.permissionStatus],
      })),
      trace,
      chapterCount: 0,
      topicCount: seeds.length,
      warnings: [
        ...(uploaded.report?.warnings ?? []),
        "Uploaded files are treated as user-provided source material; licensing is not independently verified.",
      ],
      permissionNote: uploaded.manifest?.sourceConfig.permissionAttested
        ? "User attested rights to use uploaded sources."
        : "Uploaded sources lack permission attestation and must be reviewed before training.",
      uploadParseReport: uploaded.report ?? undefined,
    })
  },
}

const webDiscoveryAdapter: DomainImportAdapter = {
  id: "web-discovery",
  label: "Web discovery adapter",
  strategy: "web_search",
  async detect(input) {
    if (!input.allowWebDiscovery) return false
    if (input.sourceStrategy === "uploaded_file") return false
    if (input.mockMode && input.domainKind !== "generic") return false
    return input.sourceKinds.includes("web_search") || input.domainKind === "generic" || Boolean(process.env.EXA_API_KEY)
  },
  async import(input, trace) {
    const web = await runWebDiscovery({
      projectId: input.projectId,
      prompt: input.prompt,
      domainKind: input.domainKind,
      allowedDomains: input.allowedDomains,
      maxSources: input.limits.maxSources,
      mockMode: input.mockMode,
    })
    const seeds: SourceDocumentSeed[] = web.documents.map((document, index) => ({
      sourceId: `web_source_${String(index + 1).padStart(3, "0")}`,
      documentId: `web_doc_${String(index + 1).padStart(3, "0")}`,
      title: document.result.title,
      url: document.result.url,
      provider: document.result.provider === "exa"
        ? "exa"
        : document.result.provider === "mock"
          ? "web_mock"
          : "firecrawl",
      domain: document.result.domain,
      permissionStatus: document.result.permissionStatus,
      notes: [
        `Discovered by ${document.result.provider}.`,
        document.result.allowedDomainMatch
          ? "Domain matched the allowed-domain list."
          : "Domain was not explicitly allow-listed; review before training.",
      ].join(" "),
      text: [
        `## Web source: ${document.result.title}`,
        `URL: ${document.result.url}`,
        `Provider: ${document.result.provider}`,
        `Permission status: ${document.result.permissionStatus}`,
        "",
        document.markdown,
      ].join("\n"),
    }))

    return makeBundle({
      adapter: webDiscoveryAdapter,
      projectId: input.projectId,
      strategy: web.scrape.scrapedCount > 0 ? "web_scrape" : "web_search",
      seeds,
      domainGraph: genericGraph(input.domainKind, seeds),
      questions: [],
      qualityTags: seeds.map((seed) => ({
        nodeId: `source-node-${seed.sourceId}`,
        domain: input.domainKind,
        tags: ["web", seed.provider, seed.permissionStatus],
      })),
      trace,
      chapterCount: 0,
      topicCount: seeds.length,
      warnings: [
        ...new Set([
          ...web.discovery.warnings,
          ...web.scrape.warnings,
          "Web sources require permission review before real training.",
        ]),
      ],
      permissionNote: "Web sources are public/provenance-tracked but still require review before training.",
      webSearchPlan: web.plan,
      webDiscovery: web.discovery,
      webScrapeReport: web.scrape,
    })
  },
}

const adapters: DomainImportAdapter[] = [
  uploadPlaceholderAdapter,
  webDiscoveryAdapter,
  localJsonFolderAdapter,
  wireNeuronsFixtureAdapter,
  codebasePlaceholderAdapter,
  syntheticSeedAdapter,
]

export async function runDomainImport(input: ImportInput): Promise<ImportedDomainBundle> {
  const trace: AdapterTraceRecord[] = []

  for (const adapter of adapters) {
    const detected = await adapter.detect(input)
    const record: AdapterTraceRecord = {
      adapterId: adapter.id,
      detected,
      selected: false,
      reason: detected ? "Adapter matched import input." : "Adapter did not match import input.",
    }
    trace.push(record)

    if (detected) {
      record.selected = true
      return adapter.import(input, trace)
    }
  }

  throw new Error("No import adapter matched and synthetic fallback is unavailable.")
}
