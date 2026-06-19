"use client"

import { useMemo, useState, type FormEvent } from "react"
import { PlayIcon, SendIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"

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
}: ProjectAssistantProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [message, setMessage] = useState(suggestedPrompt)
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [actionTopic, setActionTopic] = useState("")
  const [runningActionId, setRunningActionId] = useState<string | null>(null)
  const [actionResults, setActionResults] = useState<ActionResult[]>([])
  const [actionError, setActionError] = useState<string | null>(null)

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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle>Assistant chat</CardTitle>
          <CardDescription>
            Source-grounded local RAG over this project&apos;s chunks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {chatError ? (
            <Alert variant="destructive">
              <AlertTitle>Chat failed</AlertTitle>
              <AlertDescription>{chatError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex min-h-72 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ask a domain question. The answer must cite retrieved project
                chunks, even when the match is weak.
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
            <Label htmlFor="assistant-message">Message</Label>
            <Textarea
              id="assistant-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-24"
              placeholder="Ask a source-grounded question"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSending}>
                <SendIcon aria-hidden="true" />
                {isSending ? "Generating" : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Generated from the model goal, then grounded in retrieved chunks.
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
              />
            </div>
            {actionError ? (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}
            {actions.map((action) => (
              <div
                key={action.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <Badge variant="secondary">{action.outputFormat}</Badge>
                <p className="mt-2 text-sm font-medium">{action.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {action.description}
                </p>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  variant="outline"
                  disabled={Boolean(runningActionId)}
                  onClick={() => runAction(action)}
                >
                  <PlayIcon aria-hidden="true" />
                  {runningActionId === action.id ? "Running" : "Run"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {actionResults.map((result) => (
          <Card key={result.traceId}>
            <CardHeader>
              <CardTitle className="text-base">{result.title}</CardTitle>
              <CardDescription>{providerLabel(result.provider)}</CardDescription>
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
