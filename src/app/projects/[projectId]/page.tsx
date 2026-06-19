import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArchiveIcon,
  BotIcon,
  FileTextIcon,
  ListChecksIcon,
  RefreshCwIcon,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { PageShell } from "@/components/app/page-shell"
import { StatusBadge } from "@/components/app/status-badge"
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  readArtifactPreview,
  readBuildJob,
  readProject,
  readProjectArtifacts,
} from "@/lib/storage"

export const dynamic = "force-dynamic"

const tabItems = [
  "Overview",
  "Sources",
  "Corpus",
  "Datasets",
  "Assistant",
  "Castform Export",
  "Logs",
]

type ProjectPageProps = {
  params: Promise<{
    projectId: string
  }>
}

function PreviewBlock({
  title,
  content,
}: {
  title: string
  content: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <div className="border-b border-border px-4 py-2">
        <p className="text-sm font-medium">{title}</p>
      </div>
      <pre className="max-h-80 overflow-auto p-4 text-xs leading-5">
        {content || "No preview available."}
      </pre>
    </div>
  )
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const project = await readProject(projectId)

  if (!project) {
    notFound()
  }

  const artifacts = await readProjectArtifacts(project.id)
  const buildJob = await readBuildJob(project.id)
  const buildLogs = await readArtifactPreview(project.id, "logs/build_logs.jsonl")
  const metricCards = [
    {
      label: "Sources",
      value: project.metrics.sources,
      detail: "From source_manifest.json",
    },
    {
      label: "Documents",
      value: project.metrics.documents,
      detail: "Markdown files in documents/",
    },
    {
      label: "Chunks",
      value: project.metrics.chunks,
      detail: "Rows in chunks.jsonl",
    },
    {
      label: "Train QA",
      value: project.metrics.trainQa,
      detail: "Rows in train_qa.jsonl",
    },
    {
      label: "Eval QA",
      value: project.metrics.evalQa,
      detail: "Rows in eval_qa.jsonl",
    },
    {
      label: "Practice",
      value: project.metrics.practiceQuestions,
      detail: "Questions in markdown",
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title={project.name}
        description={project.prompt}
        actions={
          <>
            <StatusBadge status={project.status} />
            <Button variant="outline" asChild>
              <Link href="/projects/new">New workspace</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="Overview" className="min-w-0 flex-col">
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList className="w-max">
            {tabItems.map((item) => (
              <TabsTrigger key={item} value={item}>
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="Overview" className="flex flex-col gap-4">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((metric) => (
              <Card key={metric.label}>
                <CardHeader>
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-3xl">{metric.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {metric.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Import summary</CardTitle>
              <CardDescription>
                Normalized source import metadata from the selected adapter.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Adapter</p>
                <p className="font-medium">
                  {artifacts.importSummary?.adapterLabel ?? "No import summary"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Strategy</p>
                <p className="font-medium">
                  {artifacts.importSummary?.strategy ?? "Not available"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chapters/topics</p>
                <p className="font-medium">
                  {artifacts.importSummary
                    ? `${artifacts.importSummary.chapterCount} / ${artifacts.importSummary.topicCount}`
                    : "0 / 0"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Imported questions</p>
                <p className="font-medium">
                  {artifacts.importSummary?.questionCount ?? 0}
                </p>
              </div>
              {artifacts.importSummary?.warnings.length ? (
                <div className="md:col-span-2 xl:col-span-4">
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {artifacts.importSummary.warnings.map((warning) => (
                      <Badge key={warning} variant="secondary">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader>
                <CardTitle>Build steps</CardTitle>
                <CardDescription>
                  Loaded from the project manifest in local storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {project.steps.map((step) => (
                  <div key={step.id} className="flex gap-3">
                    <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <ListChecksIcon aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{step.label}</p>
                        <Badge variant="secondary">{step.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Domain spec</CardTitle>
                <CardDescription>
                  Structured plan loaded from domain_spec.json.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Domain</p>
                  <p className="font-medium">{project.domainSpec?.domain}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Target user</p>
                  <p className="font-medium">
                    {project.domainSpec?.targetUser}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Assistant behavior</p>
                  <p className="font-medium">
                    {project.domainSpec?.assistantBehaviors.join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader>
                <CardTitle>Model goal</CardTitle>
                <CardDescription>
                  Generated by the Wave 3 English-to-model planner.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Target user</p>
                  <p className="font-medium">
                    {artifacts.modelGoal?.targetUser ?? "Not generated yet"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Capabilities</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(artifacts.modelGoal?.capabilities ?? []).map((capability) => (
                      <Badge key={capability} variant="secondary">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Success criteria
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {(artifacts.modelGoal?.successCriteria ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job state</CardTitle>
                <CardDescription>
                  Synchronous today, queue-shaped for later Postgres/worker use.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {buildJob?.status ?? "No job state"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Current step</p>
                  <p className="font-medium">
                    {buildJob?.currentStep ?? "Not available"}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-medium">{buildJob?.progress ?? 0}%</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Generated actions</CardTitle>
              <CardDescription>
                These are planned product actions for the eventual hosted model.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(artifacts.modelGoal?.generatedActions ?? []).map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <Badge variant="secondary">{action.outputFormat}</Badge>
                  <p className="mt-3 font-medium">{action.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Sources" className="flex flex-col gap-4">
          <Alert>
            <FileTextIcon aria-hidden="true" />
            <AlertTitle>Source policy</AlertTitle>
            <AlertDescription>
              {project.domainSpec?.sourcePolicy.permissionNote}
            </AlertDescription>
          </Alert>
          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Permission summary</CardTitle>
                <CardDescription>
                  Permission status normalized from import metadata.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(
                  artifacts.importSummary?.permissionCounts ?? {}
                ).length ? (
                  Object.entries(
                    artifacts.importSummary?.permissionCounts ?? {}
                  ).map(([status, count]) => (
                    <Badge key={status} variant="secondary">
                      {status}: {count}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No permission summary generated yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quality tags</CardTitle>
                <CardDescription>
                  Tags preserved for later eval and reward-quality waves.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {artifacts.qualityTags.length ? (
                  artifacts.qualityTags.slice(0, 12).flatMap((record) =>
                    record.tags.map((tag) => (
                      <Badge key={`${record.nodeId}-${tag}`} variant="outline">
                        {record.nodeId}: {tag}
                      </Badge>
                    ))
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No quality tags generated yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Source manifest</CardTitle>
              <CardDescription>
                Rows loaded from source_manifest.json.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Permission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artifacts.sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="min-w-72 font-medium">
                        {source.title}
                      </TableCell>
                      <TableCell>{source.domain}</TableCell>
                      <TableCell>{source.provider}</TableCell>
                      <TableCell>{source.permissionStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PreviewBlock
            title="source_manifest.json"
            content={artifacts.sourceManifestPreview}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewBlock
              title="imports/import_summary.json"
              content={artifacts.importSummaryPreview}
            />
            <PreviewBlock
              title="imports/permissions.json"
              content={artifacts.permissionsPreview}
            />
            <PreviewBlock
              title="imports/quality_tags.json"
              content={artifacts.qualityTagsPreview}
            />
            <PreviewBlock
              title="imports/adapter_trace.json"
              content={artifacts.adapterTracePreview}
            />
          </div>
        </TabsContent>

        <TabsContent value="Corpus" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Corpus preview</CardTitle>
              <CardDescription>
                Chunk rows loaded from chunks.jsonl.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input placeholder="Search chunks" />
              <div className="grid gap-3 md:grid-cols-2">
                {artifacts.chunks.slice(0, 4).map((chunk) => (
                  <div
                    key={chunk.id}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <Badge variant="secondary">{chunk.id}</Badge>
                    <p className="mt-3 text-sm font-medium">{chunk.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {chunk.text.replace(/^## .+\n/, "").slice(0, 220)}...
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <PreviewBlock title="chunks.jsonl" content={artifacts.chunksPreview} />
        </TabsContent>

        <TabsContent value="Datasets" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>QA dataset preview</CardTitle>
              <CardDescription>
                Train and eval rows loaded from generated JSONL files.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Difficulty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...artifacts.trainQa.slice(0, 3), ...artifacts.evalQa.slice(0, 2)].map(
                    (question) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.type}</TableCell>
                        <TableCell>{question.topic}</TableCell>
                        <TableCell className="min-w-80">
                          {question.question}
                        </TableCell>
                        <TableCell>{question.difficulty}</TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewBlock
              title="datasets/train_qa.jsonl"
              content={artifacts.trainQaPreview}
            />
            <PreviewBlock
              title="datasets/eval_qa.jsonl"
              content={artifacts.evalQaPreview}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Action task dataset</CardTitle>
              <CardDescription>
                Tasks generated from the model goal and action templates.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artifacts.actionTasks.slice(0, 6).map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.actionId}</TableCell>
                      <TableCell className="min-w-80">{task.prompt}</TableCell>
                      <TableCell>{task.expectedFormat}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PreviewBlock
            title="datasets/action_tasks.jsonl"
            content={artifacts.actionTasksPreview}
          />
          <PreviewBlock
            title="datasets/practice_questions.md"
            content={artifacts.practiceQuestions}
          />
        </TabsContent>

        <TabsContent value="Assistant" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Assistant chat</CardTitle>
              <CardDescription>
                Working chat arrives in Wave 5. This layout now has real corpus
                and dataset files behind it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Suggested prompt</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Explain pre-acquisition profits in consolidation and give me a
                  practice question.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BotIcon aria-hidden="true" />
                  Assistant preview
                </div>
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Castform Export" className="flex flex-col gap-4">
          <Alert>
            <ArchiveIcon aria-hidden="true" />
            <AlertTitle>Castform export note</AlertTitle>
            <AlertDescription>
              Castform export scaffolds are added in Wave 6. Current waves
              verify corpus, import metadata, and dataset artifacts first.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 lg:grid-cols-2">
            <PreviewBlock
              title="domain_spec.json"
              content={artifacts.domainSpecPreview}
            />
            <PreviewBlock
              title="model_goal.json"
              content={artifacts.modelGoalPreview}
            />
            <PreviewBlock
              title="source_plan.json"
              content={artifacts.sourcePlanPreview}
            />
            <PreviewBlock
              title="training_plan.json"
              content={artifacts.trainingPlanPreview}
            />
            <PreviewBlock
              title="source_manifest.json"
              content={artifacts.sourceManifestPreview}
            />
            <PreviewBlock
              title="rewards/reward_spec.json"
              content={artifacts.rewardSpecPreview}
            />
          </div>
        </TabsContent>

        <TabsContent value="Logs" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Build logs</CardTitle>
              <CardDescription>
                Seed generation log loaded from logs/build_logs.jsonl.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {project.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <RefreshCwIcon aria-hidden="true" />
                  <span>{step.description}</span>
                </div>
              ))}
              {buildJob ? (
                <div className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="font-medium">Latest job: {buildJob.status}</p>
                  <p className="mt-1 text-muted-foreground">
                    {buildJob.currentStep} · {buildJob.progress}% complete
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <PreviewBlock title="logs/build_logs.jsonl" content={buildLogs.content} />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
