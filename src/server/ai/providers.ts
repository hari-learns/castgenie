import type { ActionTemplate } from "@/types/actions"
import type { ChatMessage } from "@/types/artifacts"
import type {
  ActionRequestInput,
  AssistantResponse,
  ProviderName,
  RetrievalResult,
} from "@/types/traces"

type ChatProviderInput = {
  projectName: string
  domain: string
  message: string
  history: ChatMessage[]
  retrieval: RetrievalResult
}

type ActionProviderInput = {
  projectName: string
  domain: string
  action: ActionTemplate
  input: ActionRequestInput
  retrieval: RetrievalResult
}

function citationsFrom(retrieval: RetrievalResult) {
  return retrieval.chunks.map((chunk) => chunk.citation)
}

function contextBlock(retrieval: RetrievalResult) {
  return retrieval.chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] ${chunk.title} (${chunk.id})\n${chunk.text}`
    )
    .join("\n\n")
}

function formatSources(retrieval: RetrievalResult) {
  return retrieval.chunks
    .map((chunk, index) => `${index + 1}. ${chunk.title} (${chunk.id})`)
    .join("\n")
}

function weakRetrievalNotice(retrieval: RetrievalResult) {
  const topScore = retrieval.chunks[0]?.score ?? 0
  return topScore <= 0
    ? "The retrieval match is weak, so treat this as a source-limited answer."
    : "The answer is grounded in the retrieved project chunks."
}

function mockChat(input: ChatProviderInput): AssistantResponse {
  const top = input.retrieval.chunks[0]
  const supporting = input.retrieval.chunks.slice(1, 3)

  if (!top) {
    return {
      provider: "mock",
      content:
        "I cannot answer from this project yet because no retrievable chunks are available.",
      citations: [],
    }
  }

  const supportText = supporting.length
    ? `\n\nRelated context:\n${supporting
        .map((chunk) => `- ${chunk.title}: ${chunk.text.replace(/^## .+\n/, "").slice(0, 220)}`)
        .join("\n")}`
    : ""

  return {
    provider: "mock",
    content: [
      weakRetrievalNotice(input.retrieval),
      "",
      `For "${input.message}", the strongest source is "${top.title}".`,
      top.text.replace(/^## .+\n/, "").slice(0, 700),
      supportText,
      "",
      "Sources:",
      formatSources(input.retrieval),
    ].join("\n"),
    citations: citationsFrom(input.retrieval),
  }
}

function actionHeading(action: ActionTemplate) {
  if (action.outputFormat === "mcq_set") return "MCQ Set"
  if (action.outputFormat === "question_paper") return "Question Paper"
  if (action.outputFormat === "answer_key") return "Answer Key"
  if (action.outputFormat === "audit_report") return "Security Audit Report"
  if (action.outputFormat === "lesson") return "Lesson"
  return "Source-Grounded Answer"
}

function mockAction(input: ActionProviderInput): AssistantResponse {
  const topic = input.input.topic || input.action.label
  const count = Math.max(1, Math.min(input.input.count ?? 3, 8))
  const citations = citationsFrom(input.retrieval)
  const sourceLines = formatSources(input.retrieval)
  const basis =
    input.retrieval.chunks
      .slice(0, 3)
      .map((chunk) => `- ${chunk.title}: ${chunk.text.replace(/^## .+\n/, "").slice(0, 180)}`)
      .join("\n") || "- No retrieved source context available."

  let body = ""

  if (input.action.outputFormat === "mcq_set") {
    body = Array.from({ length: count }, (_, index) => {
      const chunk = input.retrieval.chunks[index % Math.max(input.retrieval.chunks.length, 1)]
      const concept = chunk?.matchedTerms[0] || topic
      return `${index + 1}. Which statement best matches ${concept}?\nA. A source-grounded statement from the retrieved context\nB. An unsupported generalization\nC. A contradictory claim\nD. A non-domain answer\nAnswer: A\nExplanation: Use the cited chunk to justify the answer.`
    }).join("\n\n")
  } else if (input.action.outputFormat === "question_paper") {
    body = Array.from({ length: count }, (_, index) => {
      const marks = index % 2 === 0 ? 6 : 4
      const chunk = input.retrieval.chunks[index % Math.max(input.retrieval.chunks.length, 1)]
      return `Q${index + 1}. (${marks} marks) ${input.action.description} Topic: ${chunk?.title ?? topic}. Include source-grounded reasoning and cite the relevant chunk.`
    }).join("\n\n")
  } else if (input.action.outputFormat === "answer_key") {
    body = `Stepwise answer key for ${topic}:\n1. Identify the tested concept from retrieved context.\n2. State the rule or method.\n3. Apply the rule to the question facts.\n4. Allocate marks to method, calculation/reasoning, and conclusion.`
  } else if (input.action.outputFormat === "audit_report") {
    body = `Finding summary for ${topic}:\nSeverity: Review required\nEvidence: The retrieved security chunks define the review pattern.\nRisk: Do not claim exploitability without code evidence.\nFix: Add concrete validation, authorization, parameterization, and regression tests tied to the inspected code path.`
  } else if (input.action.outputFormat === "lesson") {
    body = `Lesson on ${topic}:\nConcept: Explain the idea using retrieved context.\nWorked example: Apply the concept to a simple scenario.\nCommon mistake: Avoid unsupported claims outside the source.\nPractice: Create one question that requires citing the source.`
  } else {
    body = `Answer for ${topic}:\n${basis}`
  }

  return {
    provider: "mock",
    content: [
      `# ${actionHeading(input.action)}: ${topic}`,
      "",
      weakRetrievalNotice(input.retrieval),
      "",
      body,
      "",
      "Retrieved basis:",
      basis,
      "",
      "Sources:",
      sourceLines || "No citations available.",
    ].join("\n"),
    citations,
  }
}

async function deepSeekRequest(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured")
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1600,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`DeepSeek request failed with ${response.status}: ${text.slice(0, 300)}`)
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error("DeepSeek response did not include content")
    }

    return content
  } finally {
    clearTimeout(timeout)
  }
}

function shouldUseDeepSeek() {
  if (process.env.LLM_PROVIDER === "mock") {
    return false
  }

  return Boolean(process.env.DEEPSEEK_API_KEY)
}

export async function generateChatAnswer(input: ChatProviderInput): Promise<AssistantResponse> {
  if (!shouldUseDeepSeek()) {
    return mockChat(input)
  }

  try {
    const content = await deepSeekRequest([
      {
        role: "system",
        content:
          "You are CastGenie. Answer only from provided project context. If context is weak, say so. Include a concise Sources section using chunk ids.",
      },
      {
        role: "user",
        content: [
          `Project: ${input.projectName}`,
          `Domain: ${input.domain}`,
          `User question: ${input.message}`,
          "",
          "Retrieved context:",
          contextBlock(input.retrieval),
        ].join("\n"),
      },
    ])

    return {
      provider: "deepseek",
      content,
      citations: citationsFrom(input.retrieval),
    }
  } catch {
    return mockChat(input)
  }
}

export async function generateActionOutput(input: ActionProviderInput): Promise<AssistantResponse> {
  if (!shouldUseDeepSeek()) {
    return mockAction(input)
  }

  try {
    const content = await deepSeekRequest([
      {
        role: "system",
        content:
          "You are CastGenie. Produce the requested action output using only retrieved project context. Preserve the requested format and cite chunk ids.",
      },
      {
        role: "user",
        content: [
          `Project: ${input.projectName}`,
          `Domain: ${input.domain}`,
          `Action: ${input.action.label}`,
          `Output format: ${input.action.outputFormat}`,
          `Input: ${JSON.stringify(input.input)}`,
          "",
          "Retrieved context:",
          contextBlock(input.retrieval),
        ].join("\n"),
      },
    ])

    return {
      provider: "deepseek",
      content,
      citations: citationsFrom(input.retrieval),
    }
  } catch {
    return mockAction(input)
  }
}

export function providerLabel(provider: ProviderName) {
  return provider === "deepseek" ? "DeepSeek" : "Mock local"
}
