import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/types/project"

type StatusBadgeProps = {
  status: ProjectStatus
}

const statusLabel: Record<ProjectStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  planning: "Planning",
  planning_sources: "Planning sources",
  importing_sources: "Importing",
  discovering_sources: "Discovering",
  extracting_documents: "Extracting",
  normalizing_domain: "Normalizing",
  cleaning_corpus: "Cleaning",
  chunking: "Chunking",
  indexing: "Indexing",
  generating_datasets: "Datasets",
  generating_actions: "Actions",
  generating_rewards: "Rewards",
  exporting_castform: "Exporting",
  training_castform: "Training",
  model_ready: "Model ready",
  ready: "Ready",
  failed: "Failed",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === "failed" ? "destructive" : "secondary"}>
      {statusLabel[status]}
    </Badge>
  )
}
