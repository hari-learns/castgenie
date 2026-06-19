import type { ActionTemplate } from "@/types/actions"
import type { DomainRiskLevel } from "@/types/domain"

export type ModelCapability =
  | "chat"
  | "lesson_generation"
  | "question_generation"
  | "mcq_generation"
  | "answer_key_generation"
  | "paper_generation"
  | "code_review"
  | "security_audit"
  | "explanation"
  | "classification"

export type ModelGoal = {
  id: string
  domain: string
  targetUser: string
  userIntent: string
  capabilities: ModelCapability[]
  domainExamples: string[]
  riskLevel: DomainRiskLevel
  successCriteria: string[]
  generatedActions: ActionTemplate[]
}
