import Link from "next/link"
import { ArrowRightIcon, FlaskConicalIcon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { PageShell } from "@/components/app/page-shell"
import { NewProjectForm } from "@/components/projects/new-project-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NewProjectPage() {
  return (
    <PageShell>
      <PageHeader
        title="Create domain assistant"
        description="Describe the expert assistant you want. CastGenie will plan the corpus, create source files, generate datasets, and prepare a working RAG assistant with Castform-ready artifacts."
        actions={
          <Button variant="outline" asChild>
            <Link href="/projects/demo">
              Preview demo
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <Alert>
        <FlaskConicalIcon aria-hidden="true" />
        <AlertTitle>Automatic backend build</AlertTitle>
        <AlertDescription>
          Submit the outcome you want in English. CastGenie plans sources,
          imports or discovers material, chunks the corpus, generates actions,
          creates datasets, and prepares Castform-ready artifacts automatically.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Workspace brief</CardTitle>
          <CardDescription>
            No fixed vertical is required. The prompt is the product brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </PageShell>
  )
}
