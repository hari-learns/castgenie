import type { ActionTemplate } from "@/types/actions"
import type { DomainSpec } from "@/types/domain"
import type { ModelCapability, ModelGoal } from "@/types/model-goal"
import type { SourcePlan, TrainingPlan } from "@/types/plans"

export type PlannedProject = {
  kind: "ca_edtech" | "owasp_security" | "generic"
  domainSpec: DomainSpec
  modelGoal: ModelGoal
  sourcePlan: SourcePlan
  trainingPlan: TrainingPlan
}

type PlannerInput = {
  projectId: string
  prompt: string
}

function makeAction(
  id: string,
  label: string,
  description: string,
  capability: ModelCapability,
  outputFormat: ActionTemplate["outputFormat"],
  requiredTags: string[] = []
): ActionTemplate {
  return {
    id,
    label,
    description,
    capability,
    inputSchema: {
      topic: "string",
      difficulty: "easy | medium | hard",
      count: "number optional",
    },
    outputFormat,
    retrievalPolicy: {
      requiredTags,
      maxChunks: 6,
      requireCitations: true,
    },
  }
}

function classify(prompt: string): PlannedProject["kind"] {
  const normalized = prompt.toLowerCase()

  if (
    normalized.includes("owasp") ||
    normalized.includes("vulnerab") ||
    normalized.includes("security") ||
    normalized.includes("codebase") ||
    normalized.includes("bug")
  ) {
    return "owasp_security"
  }

  if (
    normalized.includes("compliance") ||
    normalized.includes("compliant") ||
    normalized.includes("non-compliant") ||
    normalized.includes("regulation") ||
    normalized.includes("regulatory") ||
    normalized.includes("policy") ||
    normalized.includes("internal standard")
  ) {
    return "generic"
  }

  if (
    normalized.includes(" ca ") ||
    normalized.includes("chartered accountant") ||
    normalized.includes("advanced accounting") ||
    normalized.includes("direct tax") ||
    normalized.includes("mcq") ||
    normalized.includes("question paper") ||
    normalized.includes("ed tech") ||
    normalized.includes("ed-tech")
  ) {
    return "ca_edtech"
  }

  return "generic"
}

export function planProject({ projectId, prompt }: PlannerInput): PlannedProject {
  const kind = classify(` ${prompt} `)

  if (kind === "owasp_security") {
    const actions = [
      makeAction(
        "scan-codebase",
        "Scan codebase for OWASP bugs",
        "Generate a source-grounded vulnerability report with severity and fix guidance.",
        "security_audit",
        "audit_report",
        ["owasp", "security"]
      ),
      makeAction(
        "explain-vulnerability",
        "Explain vulnerability and fix",
        "Explain a detected vulnerability, exploit path, and secure remediation.",
        "explanation",
        "chat_answer",
        ["owasp"]
      ),
      makeAction(
        "secure-checklist",
        "Generate secure-code checklist",
        "Create a review checklist for the target stack and OWASP category.",
        "code_review",
        "audit_report",
        ["checklist"]
      ),
    ]

    return makePlannedProject({
      projectId,
      prompt,
      kind,
      domain: "OWASP code security",
      title: "OWASP Code Security Model",
      targetUser: "Engineering team reviewing application code",
      capabilities: ["chat", "code_review", "security_audit", "explanation"],
      actions,
      riskLevel: "high",
      sourceKinds: ["synthetic_seed", "codebase"],
      successCriteria: [
        "Find common OWASP vulnerability patterns",
        "Explain exploitability and remediation",
        "Generate secure review checklists",
        "Avoid claiming execution-based findings without code evidence",
      ],
    })
  }

  if (kind === "ca_edtech") {
    const actions = [
      makeAction(
        "generate-lesson",
        "Create simplified lesson",
        "Generate a concept lesson with examples, mistakes, and citations.",
        "lesson_generation",
        "lesson",
        ["lesson", "concept"]
      ),
      makeAction(
        "generate-mcqs",
        "Generate Direct Tax MCQs",
        "Create MCQs with answer key and source-grounded explanations.",
        "mcq_generation",
        "mcq_set",
        ["mcq", "tax"]
      ),
      makeAction(
        "generate-paper",
        "Generate Advanced Accounting paper",
        "Create an exam-style question paper with marks and topic coverage.",
        "paper_generation",
        "question_paper",
        ["question-paper", "accounting"]
      ),
      makeAction(
        "generate-answer-key",
        "Create answer key with marking scheme",
        "Create a marking-oriented answer key with stepwise reasoning.",
        "answer_key_generation",
        "answer_key",
        ["answer-key"]
      ),
      makeAction(
        "weak-topic-practice",
        "Generate weak-topic practice set",
        "Create targeted practice questions for weak syllabus nodes.",
        "question_generation",
        "question_paper",
        ["practice"]
      ),
    ]

    return makePlannedProject({
      projectId,
      prompt,
      kind,
      domain: "CA ed-tech",
      title: "CA Ed-Tech Model",
      targetUser: "CA learner preparing for exams",
      capabilities: [
        "chat",
        "lesson_generation",
        "question_generation",
        "mcq_generation",
        "answer_key_generation",
        "paper_generation",
        "explanation",
      ],
      actions,
      riskLevel: "medium",
      sourceKinds: ["synthetic_seed", "wire_neurons_json", "uploaded_file"],
      successCriteria: [
        "Generate syllabus-aligned lessons and questions",
        "Produce MCQs and question papers with answer keys",
        "Ground explanations in provided material",
        "Track source permissions for past papers and study content",
      ],
    })
  }

  const normalizedPrompt = prompt.toLowerCase()

  if (
    normalizedPrompt.includes("compliance") ||
    normalizedPrompt.includes("compliant") ||
    normalizedPrompt.includes("non-compliant") ||
    normalizedPrompt.includes("regulation") ||
    normalizedPrompt.includes("regulatory") ||
    normalizedPrompt.includes("policy") ||
    normalizedPrompt.includes("internal standard")
  ) {
    const actions = [
      makeAction(
        "assess-compliance",
        "Assess compliant vs non-compliant",
        "Evaluate a scenario against retrieved policy or regulatory material and explain the decision.",
        "explanation",
        "audit_report",
        ["compliance", "policy", "regulation"]
      ),
      makeAction(
        "explain-non-compliance",
        "Explain non-compliance risk",
        "Identify likely gaps, missing evidence, and remediation steps with citations.",
        "explanation",
        "chat_answer",
        ["risk", "non-compliant", "control"]
      ),
      makeAction(
        "create-control-checklist",
        "Create compliance checklist",
        "Generate a control checklist for reviewing future cases against the source material.",
        "question_generation",
        "audit_report",
        ["checklist", "control", "policy"]
      ),
    ]

    return makePlannedProject({
      projectId,
      prompt,
      kind,
      domain: "Compliance assessment",
      title: "Compliance Assessment Model",
      targetUser: "Compliance reviewer assessing company scenarios",
      capabilities: ["chat", "explanation", "question_generation"],
      actions,
      riskLevel: "high",
      sourceKinds: ["uploaded_file", "web_search", "synthetic_seed"],
      successCriteria: [
        "Assess scenarios against cited policy or regulatory source material",
        "Explain compliant and non-compliant outcomes with evidence",
        "Generate reusable control checklists",
        "Avoid legal conclusions when source evidence is incomplete",
      ],
    })
  }

  const actions = [
    makeAction(
      "answer-with-sources",
      "Answer with sources",
      "Answer domain questions from the generated corpus.",
      "chat",
      "chat_answer",
      ["source-grounded"]
    ),
    makeAction(
      "create-lesson",
      "Create lesson",
      "Generate a structured lesson with examples and checks for understanding.",
      "lesson_generation",
      "lesson",
      ["lesson"]
    ),
    makeAction(
      "create-eval-questions",
      "Create eval questions",
      "Generate source-grounded eval questions for the target domain.",
      "question_generation",
      "question_paper",
      ["eval"]
    ),
  ]

  return makePlannedProject({
    projectId,
    prompt,
    kind,
    domain: "Custom expert domain",
    title: "Custom Expert Model",
    targetUser: "User-defined domain operator",
    capabilities: ["chat", "lesson_generation", "question_generation", "explanation"],
    actions,
    riskLevel: "low",
    sourceKinds: ["synthetic_seed", "uploaded_file", "web_search"],
    successCriteria: [
      "Explain domain concepts from source material",
      "Generate training and evaluation examples",
      "Expose useful actions without requiring users to configure the pipeline",
    ],
  })
}

function makePlannedProject(input: {
  projectId: string
  prompt: string
  kind: PlannedProject["kind"]
  domain: string
  title: string
  targetUser: string
  capabilities: ModelCapability[]
  actions: ActionTemplate[]
  riskLevel: DomainSpec["safetyPolicy"]["riskLevel"]
  sourceKinds: SourcePlan["requiredSourceKinds"]
  successCriteria: string[]
}): PlannedProject {
  const domainSpec: DomainSpec = {
    id: `domain_${input.projectId}`,
    title: input.title,
    domain: input.domain,
    targetUser: input.targetUser,
    level: "advanced",
    assistantBehaviors: input.actions.map((action) => action.description),
    artifactTypes: [
      "rag_corpus",
      "source_manifest",
      "practice_questions",
      "train_qa",
      "eval_qa",
      "castform_project",
    ],
    sourcePolicy: {
      allowedDomains: ["castgenie.local"],
      blockedDomains: [],
      requireCitations: true,
      allowUserProvidedDocs: true,
      permissionNote:
        "Wave 4 import data is synthetic or user-provided by default. Real projects must use public, licensed, or explicitly permitted material.",
    },
    safetyPolicy: {
      riskLevel: input.riskLevel,
      disallowedAdvice: [
        "Do not claim unsupported source permissions.",
        "Do not present generated output as professional advice without review.",
      ],
      requiredDisclaimer:
        "Prototype output. Review sources, permissions, and generated artifacts before real training or deployment.",
    },
    outputStyle: {
      tone: "clear, rigorous, source-grounded",
      answerStructure: [
        "Direct answer",
        "Reasoning",
        "Example or finding",
        "Common mistake or caveat",
        "Sources",
      ],
      citationStyle: "source-list",
    },
  }

  return {
    kind: input.kind,
    domainSpec,
    modelGoal: {
      id: `goal_${input.projectId}`,
      domain: input.domain,
      targetUser: input.targetUser,
      userIntent: input.prompt,
      capabilities: input.capabilities,
      domainExamples: input.actions.map((action) => action.label),
      riskLevel: input.riskLevel,
      successCriteria: input.successCriteria,
      generatedActions: input.actions,
    },
    sourcePlan: {
      id: `source_plan_${input.projectId}`,
      projectId: input.projectId,
      requiredSourceKinds: input.sourceKinds,
      permissionAssumptions: [
        "Synthetic mock data is allowed for prototype demonstration.",
        "Production training requires explicit public, licensed, or user-provided permission.",
      ],
      strategy: input.kind === "ca_edtech" ? "fixture_import" : "mock_seed",
      fallbackStrategy:
        "Use deterministic synthetic seed documents when richer imports, external sources, or uploads are unavailable.",
    },
    trainingPlan: {
      id: `training_plan_${input.projectId}`,
      projectId: input.projectId,
      ragFirst: true,
      datasetTypes: ["chunks", "train_qa", "eval_qa", "action_tasks"],
      evalObjectives: [
        "citation presence",
        "source overlap",
        "format validity",
        "task usefulness",
      ],
      rewardObjectives: [
        "valid source-grounded output",
        "format compliance",
        "diversity without rewarding invalid novelty",
      ],
      castformTarget: "workspace_export",
    },
  }
}
