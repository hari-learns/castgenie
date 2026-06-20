"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  PlayIcon,
  RefreshCwIcon,
} from "lucide-react"

import type { ModelLifecycle } from "@/lib/model-lifecycle"
import type {
  CastformRun,
  CastformRunsResponse,
  ModelVersion,
  TrainingReadiness,
} from "@/types/castform"
import { ModelLifecycleCard } from "@/components/projects/model-lifecycle-card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CastformRunsPanelProps = {
  projectId: string
  initialState: CastformRunsResponse
  lifecycle: ModelLifecycle
}

function statusVariant(status: CastformRun["status"]) {
  return status === "complete"
    ? "default"
    : status === "failed" || status === "blocked"
      ? "destructive"
      : "secondary"
}

function ReadinessPanel({ readiness }: { readiness: TrainingReadiness }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training readiness</CardTitle>
        <CardDescription>
          Local artifact and permission checks before any Castform launch.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={readiness.readyForReal ? "default" : "destructive"}>
            {readiness.readyForReal ? "Real launch ready" : "Real launch blocked"}
          </Badge>
          <Badge variant="secondary">
            Sources: {readiness.sourcePermissions.total}
          </Badge>
          <Badge variant="secondary">Chunks: {readiness.datasetCounts.chunks}</Badge>
          <Badge variant="secondary">
            Train/Eval: {readiness.datasetCounts.trainQa} /{" "}
            {readiness.datasetCounts.evalQa}
          </Badge>
        </div>

        {readiness.blockingIssues.length ? (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>Blocking issues</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 flex flex-col gap-1">
                {readiness.blockingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>Ready for configured launch</AlertTitle>
            <AlertDescription>
              Required artifacts are present and source permissions do not block
              real training.
            </AlertDescription>
          </Alert>
        )}

        {readiness.warnings.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Warnings</p>
            <div className="flex flex-wrap gap-2">
              {readiness.warnings.map((warning) => (
                <Badge key={warning} variant="outline">
                  {warning}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rows</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readiness.artifacts.map((artifact) => (
              <TableRow key={artifact.path}>
                <TableCell className="min-w-64">{artifact.label}</TableCell>
                <TableCell>
                  <Badge variant={artifact.exists ? "secondary" : "destructive"}>
                    {artifact.exists ? "present" : "missing"}
                  </Badge>
                </TableCell>
                <TableCell>{artifact.count ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ModelVersions({ versions }: { versions: ModelVersion[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model versions</CardTitle>
        <CardDescription>
          Stored model metadata. Only hosted versions are used by the main chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {versions.length ? (
          versions.map((version) => (
            <div key={version.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{version.id}</p>
                <Badge variant="secondary">{version.status}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                Chunks {version.corpusSummary.chunks} · Train/Eval{" "}
                {version.datasetSummary.trainQa} / {version.datasetSummary.evalQa}
              </p>
              {version.modelEndpoint ? (
                <p className="mt-2 break-all text-muted-foreground">
                  Endpoint: {version.modelEndpoint}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No hosted model version yet. CastGenie will keep chat locked until
            real Castform training produces one.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CastformRunsPanel({
  projectId,
  initialState,
  lifecycle,
}: CastformRunsPanelProps) {
  const [state, setState] = useState(initialState)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const realLaunchEnabled = useMemo(
    () =>
      state.config.realRunsEnabled &&
      state.config.hasApiKey &&
      state.readiness.readyForReal,
    [state]
  )

  async function createRun(mode: "mock" | "real") {
    setPending(mode)
    setError(null)
    const response = await fetch(`/api/projects/${projectId}/castform/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    })
    const payload = (await response.json().catch(() => null)) as
      | { state?: CastformRunsResponse; error?: string }
      | null

    if (!response.ok || !payload?.state) {
      setError(payload?.error ?? "Unable to create Castform run.")
    } else {
      setState(payload.state)
    }

    setPending(null)
  }

  async function refreshRun(run: CastformRun) {
    setPending(run.id)
    setError(null)
    const response = await fetch(
      `/api/projects/${projectId}/castform/runs/${run.id}/refresh`,
      { method: "POST" }
    )
    const payload = (await response.json().catch(() => null)) as
      | { state?: CastformRunsResponse; error?: string }
      | null

    if (!response.ok || !payload?.state) {
      setError(payload?.error ?? "Unable to refresh Castform run.")
    } else {
      setState(payload.state)
    }

    setPending(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ModelLifecycleCard lifecycle={lifecycle} />
        <Card>
          <CardHeader>
            <CardTitle>Training overview</CardTitle>
            <CardDescription>
              CastGenie keeps local preview separate from real Castform training.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Latest run</p>
              <p className="font-medium">{state.latestRun?.status ?? "None"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hosted models</p>
              <p className="font-medium">
                {state.modelVersions.filter((version) => version.status === "hosted").length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Readiness</p>
              <p className="font-medium">
                {state.readiness.readyForReal ? "Ready for real launch" : "Blocked"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Simulation</p>
              <p className="font-medium">Mock runs are preview only</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <ReadinessPanel readiness={state.readiness} />

      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
          <CardDescription>
            Real runs use Castform credits. Mock runs are local simulations only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Castform action failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => createRun("mock")}
            >
              <PlayIcon aria-hidden="true" />
              Create preview simulation
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(pending) || !realLaunchEnabled}
              onClick={() => createRun("real")}
            >
              <PlayIcon aria-hidden="true" />
              Launch real Castform run
            </Button>
          </div>

          {state.runs.length ? (
            <div className="flex flex-col gap-3">
              {state.runs.map((run) => (
                <div key={`${run.id}-${run.updatedAt}`} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{run.id}</p>
                        <Badge variant={statusVariant(run.status)}>
                          {run.status}
                        </Badge>
                        <Badge variant="outline">{run.mode}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Progress {run.progress}% · refreshed {run.refreshCount} times
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(pending)}
                      onClick={() => refreshRun(run)}
                    >
                      <RefreshCwIcon aria-hidden="true" />
                      Refresh status
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {run.providerJobId ? (
                      <p className="break-all text-muted-foreground">
                        Provider job: {run.providerJobId}
                      </p>
                    ) : null}
                    {run.castformRunId ? (
                      <p className="break-all text-muted-foreground">
                        Castform run: {run.castformRunId}
                      </p>
                    ) : null}
                    {run.validationReportPath ? (
                      <p className="break-all text-muted-foreground">
                        Validation: {run.validationReportPath}
                      </p>
                    ) : null}
                    {run.launchConfigPath ? (
                      <p className="break-all text-muted-foreground">
                        Launch config: {run.launchConfigPath}
                      </p>
                    ) : null}
                  </div>
                  {run.error ? (
                    <p className="mt-2 text-sm text-destructive">{run.error}</p>
                  ) : null}
                  {run.statusUrl ? (
                    <p className="mt-2 break-all text-sm text-muted-foreground">
                      Status: {run.statusUrl}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No Castform runs yet.
            </div>
          )}
        </CardContent>
      </Card>

      <ModelVersions versions={state.modelVersions} />

      <Card>
        <CardHeader>
          <CardTitle>Config</CardTitle>
          <CardDescription>
            Server-side settings used for real Castform launch and hosted chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Auto launch</p>
            <p className="font-medium">
              {state.config.autoLaunchEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Real runs</p>
            <p className="font-medium">
              {state.config.realRunsEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">API key</p>
            <p className="font-medium">
              {state.config.hasApiKey ? "Configured" : "Missing"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Base model</p>
            <p className="font-medium">{state.config.baseModel}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inference endpoint</p>
            <p className="break-all font-medium">{state.config.inferenceBaseUrl}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Python</p>
            <p className="break-all font-medium">{state.config.pythonBin}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
