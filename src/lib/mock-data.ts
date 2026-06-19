import {
  ArchiveIcon,
  BotIcon,
  BrainCircuitIcon,
  ClipboardCheckIcon,
  DatabaseIcon,
  FileSearchIcon,
  type LucideIcon,
} from "lucide-react"

export type WorkflowCard = {
  title: string
  description: string
  icon: LucideIcon
}

export type BuildStep = {
  label: string
  description: string
  status: "complete" | "running" | "pending"
}

export const workflowCards: WorkflowCard[] = [
  {
    title: "Plan",
    description: "Convert plain English into a structured domain spec.",
    icon: BrainCircuitIcon,
  },
  {
    title: "Source",
    description: "Find or load material with permission notes attached.",
    icon: FileSearchIcon,
  },
  {
    title: "Corpus",
    description: "Clean documents, chunk them, and prepare retrieval data.",
    icon: DatabaseIcon,
  },
  {
    title: "Assistant",
    description: "Open a working RAG assistant with visible citations.",
    icon: BotIcon,
  },
  {
    title: "Castform Export",
    description: "Package corpus, QA files, evals, rewards, and scaffolds.",
    icon: ArchiveIcon,
  },
]

export const demoBuildSteps: BuildStep[] = [
  {
    label: "Planning",
    description: "Domain spec generated from the CA Advanced Accounting prompt.",
    status: "complete",
  },
  {
    label: "Discovering sources",
    description: "Seed source manifest prepared for the demo workspace.",
    status: "complete",
  },
  {
    label: "Chunking corpus",
    description: "Synthetic accounting notes split into retrievable chunks.",
    status: "running",
  },
  {
    label: "Generating datasets",
    description: "Train QA, eval QA, and practice questions are staged next.",
    status: "pending",
  },
  {
    label: "Exporting Castform",
    description: "Training workspace files will appear after the pipeline exists.",
    status: "pending",
  },
]

export const demoMetrics = [
  { label: "Sources", value: "6", detail: "Synthetic seed docs" },
  { label: "Chunks", value: "42", detail: "Preview count" },
  { label: "Train QA", value: "50", detail: "Target output" },
  { label: "Eval QA", value: "15", detail: "Target output" },
]

export const demoSources = [
  {
    title: "Consolidated financial statements basics",
    domain: "castgenie.local",
    provider: "seed",
    permission: "Synthetic demo",
  },
  {
    title: "Goodwill and capital reserve",
    domain: "castgenie.local",
    provider: "seed",
    permission: "Synthetic demo",
  },
  {
    title: "Internal transaction adjustments",
    domain: "castgenie.local",
    provider: "seed",
    permission: "Synthetic demo",
  },
]

export const demoQuestions = [
  {
    topic: "Consolidation",
    question: "Explain pre-acquisition profits and their treatment.",
    difficulty: "Medium",
  },
  {
    topic: "Goodwill",
    question: "Set up the calculation for goodwill on acquisition.",
    difficulty: "Hard",
  },
  {
    topic: "Journal entries",
    question: "Correct an unrealized profit adjustment entry.",
    difficulty: "Medium",
  },
]

export const navItems = [
  { title: "Dashboard", href: "/", icon: ClipboardCheckIcon },
  { title: "Create", href: "/projects/new", icon: BrainCircuitIcon },
  { title: "Demo workspace", href: "/projects/demo", icon: BotIcon },
]
