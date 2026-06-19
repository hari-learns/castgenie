export type DomainRiskLevel = "low" | "medium" | "high"

export type DomainSpec = {
  id: string
  title: string
  domain: string
  region?: string
  targetUser: string
  level: "beginner" | "intermediate" | "advanced" | "expert"
  assistantBehaviors: string[]
  artifactTypes: ArtifactType[]
  sourcePolicy: {
    allowedDomains: string[]
    blockedDomains: string[]
    requireCitations: boolean
    allowUserProvidedDocs: boolean
    permissionNote: string
  }
  safetyPolicy: {
    riskLevel: DomainRiskLevel
    disallowedAdvice: string[]
    requiredDisclaimer?: string
  }
  outputStyle: {
    tone: string
    answerStructure: string[]
    citationStyle: "inline" | "footnote" | "source-list"
  }
}

export type ArtifactType =
  | "rag_corpus"
  | "source_manifest"
  | "practice_questions"
  | "train_qa"
  | "eval_qa"
  | "castform_project"
  | "demo_chat_transcript"
