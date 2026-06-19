import Link from "next/link"
import {
  ArrowRightIcon,
  FolderPlusIcon,
  InboxIcon,
  SparklesIcon,
} from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { PageShell } from "@/components/app/page-shell"
import { StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { workflowCards } from "@/lib/mock-data"
import { listProjects } from "@/lib/storage"

export const dynamic = "force-dynamic"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export default async function Home() {
  const projects = await listProjects()

  return (
    <PageShell>
      <PageHeader
        title="CastGenie"
        description="English to working domain assistant and Castform-ready training workspace."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <FolderPlusIcon data-icon="inline-start" aria-hidden="true" />
              Create domain assistant
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>English to RAG assistant to Castform workspace</CardTitle>
            <CardDescription>
              Describe a domain outcome once. CastGenie turns that intent into
              corpus, evaluation, assistant, and export surfaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Plain-English brief", "Working RAG assistant", "Castform export"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-muted/40 p-4"
                  >
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo workspace</CardTitle>
            <CardDescription>
              Open the seeded CA Advanced Accounting workspace loaded from
              local artifact storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/projects/demo">
                Open demo workspace
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent workspaces</CardTitle>
            <CardDescription>
              Workspaces are loaded from local JSON files in storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sources</TableHead>
                      <TableHead>Chunks</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="min-w-64">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.domainSpec?.domain ?? "Domain pending"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} />
                        </TableCell>
                        <TableCell>{project.metrics.sources}</TableCell>
                        <TableCell>{project.metrics.chunks}</TableCell>
                        <TableCell>{formatDate(project.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/projects/${project.id}`}>
                              Open
                              <ArrowRightIcon
                                data-icon="inline-end"
                                aria-hidden="true"
                              />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <InboxIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No workspaces yet</EmptyTitle>
                  <EmptyDescription>
                    Create your first domain assistant from a plain-English
                    prompt.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" asChild>
                    <Link href="/projects/new">
                      <SparklesIcon data-icon="inline-start" aria-hidden="true" />
                      Start a workspace
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {workflowCards.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <item.icon aria-hidden="true" />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </PageShell>
  )
}
