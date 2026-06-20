import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  GraduationCapIcon,
} from "lucide-react"

import type { ModelLifecycle } from "@/lib/model-lifecycle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ModelLifecycleCardProps = {
  lifecycle: ModelLifecycle
  compact?: boolean
}

function LifecycleIcon({ lifecycle }: { lifecycle: ModelLifecycle }) {
  if (lifecycle.tone === "ready") return <CheckCircle2Icon aria-hidden="true" />
  if (lifecycle.tone === "blocked") return <AlertTriangleIcon aria-hidden="true" />
  if (lifecycle.tone === "preview") return <EyeIcon aria-hidden="true" />
  if (lifecycle.status === "training_castform") {
    return <GraduationCapIcon aria-hidden="true" />
  }
  return <ClockIcon aria-hidden="true" />
}

function badgeVariant(lifecycle: ModelLifecycle) {
  if (lifecycle.tone === "ready") return "default" as const
  if (lifecycle.tone === "blocked") return "destructive" as const
  return "secondary" as const
}

export function ModelLifecycleCard({
  lifecycle,
  compact = false,
}: ModelLifecycleCardProps) {
  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Model status</CardTitle>
            <CardDescription>{lifecycle.summary}</CardDescription>
          </div>
          <Badge variant={badgeVariant(lifecycle)}>{lifecycle.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant={lifecycle.tone === "blocked" ? "destructive" : "default"}>
          <LifecycleIcon lifecycle={lifecycle} />
          <AlertTitle>{lifecycle.label}</AlertTitle>
          <AlertDescription>{lifecycle.detail}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
