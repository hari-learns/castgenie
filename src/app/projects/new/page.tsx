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
          Submit an English model request. CastGenie will plan and run the
          Wave 3 mock backend pipeline automatically.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Workspace brief</CardTitle>
          <CardDescription>
            Use the CA Advanced Accounting demo or describe a custom domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </PageShell>
  )
}
