"use client"

import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  PlayIcon,
  SendIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react"

import type { ActionTemplate } from "@/types/actions"
import type { ChatCitation, ChatMessage } from "@/types/artifacts"
import type { ProviderName, RetrievedChunk } from "@/types/traces"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type AssistantChatResponse = {
  traceId: string
  message: ChatMessage
  citations: ChatCitation[]
  retrievedChunks: RetrievedChunk[]
  provider: ProviderName
}

type ActionResponse = {
  traceId: string
  actionId: string
  title: string
  output: string
  citations: ChatCitation[]
  retrievedChunks: RetrievedChunk[]
  provider: ProviderName
}

type ActionResult = ActionResponse & {
  feedback?: "up" | "down"
}

type LocalMessage = ChatMessage & {
  traceId?: string
  provider?: ProviderName
  feedback?: "up" | "down"
}

type ProjectAssistantProps = {
  projectId: string
  actions: ActionTemplate[]
  suggestedPrompt: string
  disabled?: boolean
  disabledReason?: string
  contextSlot?: ReactNode
}

function providerLabel(provider?: ProviderName) {
  return provider === "gemini" ? "Gemini" : "Mock local"
}

function CitationList({ citations }: { citations?: ChatCitation[] }) {
  if (!citations?.length) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citations.map((citation) => (
        <Badge key={`${citation.sourceId}-${citation.chunkId}`} variant="secondary">
          {citation.chunkId}: {citation.title}
        </Badge>
      ))}
    </div>
  )
}

export function ProjectAssistant({
  projectId,
  actions,
  suggestedPrompt,
  disabled = false,
  disabledReason = "This model is not ready yet.",
  contextSlot,
}: ProjectAssistantProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [message, setMessage] = useState(suggestedPrompt)
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [actionTopic, setActionTopic] = useState("")
  const [runningActionId, setRunningActionId] = useState<string | null>(null)
  const [actionResults, setActionResults] = useState<ActionResult[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const chatHistory = useMemo(
    () =>
      messages.map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        citations: item.citations,
        createdAt: item.createdAt,
      })),
    [messages]
  )

  async function submitFeedback(
    traceType: "chat" | "action",
    traceId: string,
    rating: "up" | "down"
  ) {
    await fetch(`/api/projects/${projectId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traceType, traceId, rating }),
    })
  }

  async function onChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) {
      return
    }
    const trimmed = message.trim()

    if (!trimmed || isSending) {
      return
    }

    setChatError(null)
    setIsSending(true)

    const userMessage: LocalMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage])
    setMessage("")

    const response = await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        history: chatHistory,
      }),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      setChatError(payload?.error ?? "Unable to generate response")
      setIsSending(false)
      return
    }

    const payload = (await response.json()) as AssistantChatResponse
    setMessages((current) => [
      ...current,
      {
        ...payload.message,
        traceId: payload.traceId,
        provider: payload.provider,
      },
    ])
    setIsSending(false)
  }

  async function runAction(action: ActionTemplate) {
    if (disabled) {
      return
    }

    setActionError(null)
    setRunningActionId(action.id)

    const response = await fetch(
      `/api/projects/${projectId}/actions/${action.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: actionTopic.trim() || action.label,
          difficulty: "medium",
          count: 3,
        }),
      }
    )

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null
      setActionError(payload?.error ?? "Unable to run action")
      setRunningActionId(null)
      return
    }

    const payload = (await response.json()) as ActionResponse
    setActionResults((current) => [payload, ...current])
    setRunningActionId(null)
  }

  async function rateChat(traceId: string, rating: "up" | "down") {
    await submitFeedback("chat", traceId, rating)
    setMessages((current) =>
      current.map((item) => (item.traceId === traceId ? { ...item, feedback: rating } : item))
    )
  }

  async function rateAction(traceId: string, rating: "up" | "down") {
    await submitFeedback("action", traceId, rating)
    setActionResults((current) =>
      current.map((item) => (item.traceId === traceId ? { ...item, feedback: rating } : item))
    )
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1500)
  }

  function actionMarkdown(result: ActionResult) {
    const citations = result.citations.length
      ? result.citations
          .map(
            (citation) =>
              `- ${citation.title} (${citation.chunkId})${citation.url ? `: ${citation.url}` : ""}`
          )
          .join("\n")
      : "- No citations returned."

    return `# ${result.title}

Provider: ${providerLabel(result.provider)}
Trace: ${result.traceId}

## Output

${result.output}

## Citations

${citations}
`
  }

  function downloadActionResult(result: ActionResult) {
    const blob = new Blob([actionMarkdown(result)], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${result.actionId}-${result.traceId}.md`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_24rem]">
      {contextSlot}
      <Card>
        <CardHeader>
          <CardTitle>Ask this model</CardTitle>
          <CardDescription>
            Answers use the sources prepared for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {disabled ? (
            <Alert>
              <AlertTitle>Model not ready yet</AlertTitle>
              <AlertDescription>{disabledReason}</AlertDescription>
            </Alert>
          ) : null}

          {chatError ? (
            <Alert variant="destructive">
              <AlertTitle>Chat failed</AlertTitle>
              <AlertDescription>{chatError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex min-h-72 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ask a question about this project. If the source material is weak,
                the model should say so.
              </div>
            ) : null}
            {isSending ? (
              <div className="max-w-[95%] rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                  Reading the project sources and writing an answer
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ) : null}

            {messages.map((item) => (
              <div
                key={item.id}
                className={
                  item.role === "user"
                    ? "ml-auto max-w-[90%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[95%] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                }
              >
                {item.provider ? (
                  <Badge variant="outline">{providerLabel(item.provider)}</Badge>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap leading-6">{item.content}</p>
                <CitationList citations={item.citations} />
                {item.traceId ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant={item.feedback === "up" ? "default" : "outline"}
                      type="button"
                      onClick={() => rateChat(item.traceId!, "up")}
                    >
                      <ThumbsUpIcon aria-hidden="true" />
                      Useful
                    </Button>
                    <Button
                      size="sm"
                      variant={item.feedback === "down" ? "default" : "outline"}
                      type="button"
                      onClick={() => rateChat(item.traceId!, "down")}
                    >
                      <ThumbsDownIcon aria-hidden="true" />
                      Weak
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <form className="flex flex-col gap-3" onSubmit={onChatSubmit}>
            <Label htmlFor="assistant-message">Your question</Label>
            <Textarea
              id="assistant-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24"
              disabled={disabled}
              placeholder={
                disabled
                  ? "Chat unlocks when the model is ready"
                  : "Ask the model a question"
              }
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={disabled || isSending}>
                {isSending ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon aria-hidden="true" />
                )}
                {isSending ? "Generating" : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
            <CardDescription>
              One-click outputs CastGenie prepared for this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="action-topic">Topic or focus</Label>
              <Input
                id="action-topic"
                value={actionTopic}
                onChange={(event) => setActionTopic(event.target.value)}
                placeholder="Advanced Accounting paper"
                disabled={disabled}
              />
            </div>
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}
            {actions.length ? (
              actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{action.outputFormat}</Badge>
                    <Badge variant="outline">{action.capability}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{action.label}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {action.description}
                  </p>
                  <Button
                    type="button"
                    className="mt-3 w-full"
                    variant="outline"
                    disabled={disabled || Boolean(runningActionId)}
                    onClick={() => runAction(action)}
                  >
                    {runningActionId === action.id ? (
                      <Loader2Icon className="animate-spin" aria-hidden="true" />
                    ) : (
                      <PlayIcon aria-hidden="true" />
                    )}
                    {runningActionId === action.id ? "Running" : "Run action"}
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No workflows are available yet. Rebuild the project after setup
                completes.
              </div>
            )}
          </CardContent>
        </Card>

        {runningActionId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action running</CardTitle>
              <CardDescription>
                Reading the project sources and formatting the output.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ) : null}

        {actionResults.length === 0 && !runningActionId ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Run a workflow to generate a reusable output with citations,
              feedback, copy, and markdown download controls.
            </CardContent>
          </Card>
        ) : null}

        {actionResults.map((result) => (
          <Card key={result.traceId}>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <CardDescription>{providerLabel(result.provider)}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => copyText(`${result.traceId}-output`, result.output)}
                  >
                    {copiedKey === `${result.traceId}-output` ? (
                      <CheckIcon aria-hidden="true" />
                    ) : (
                      <CopyIcon aria-hidden="true" />
                    )}
                    Output
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      copyText(
                        `${result.traceId}-citations`,
                        result.citations
                          .map(
                            (citation) =>
                              `${citation.title} (${citation.chunkId})${citation.url ? ` ${citation.url}` : ""}`
                          )
                          .join("\n")
                      )
                    }
                  >
                    {copiedKey === `${result.traceId}-citations` ? (
                      <CheckIcon aria-hidden="true" />
                    ) : (
                      <CopyIcon aria-hidden="true" />
                    )}
                    Citations
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => downloadActionResult(result)}
                  >
                    <DownloadIcon aria-hidden="true" />
                    .md
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap leading-6">{result.output}</p>
              <CitationList citations={result.citations} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={result.feedback === "up" ? "default" : "outline"}
                  type="button"
                  onClick={() => rateAction(result.traceId, "up")}
                >
                  <ThumbsUpIcon aria-hidden="true" />
                  Useful
                </Button>
                <Button
                  size="sm"
                  variant={result.feedback === "down" ? "default" : "outline"}
                  type="button"
                  onClick={() => rateAction(result.traceId, "down")}
                >
                  <ThumbsDownIcon aria-hidden="true" />
                  Weak
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
