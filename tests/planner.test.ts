import { describe, expect, it } from "vitest"

import { planProject } from "@/server/pipeline/mock-planner"

describe("planProject", () => {
  it("classifies CA ed-tech requests and creates exam actions", () => {
    const plan = planProject({
      projectId: "test-ca",
      prompt: "Build a CA ed tech model that generates MCQs and question papers for Advanced Accounting.",
    })

    expect(plan.kind).toBe("ca_edtech")
    expect(plan.modelGoal.generatedActions.map((action) => action.id)).toEqual(
      expect.arrayContaining(["generate-paper", "generate-mcqs", "generate-answer-key"])
    )
    expect(plan.trainingPlan.datasetTypes).toContain("action_tasks")
  })

  it("classifies security requests and avoids CA-specific actions", () => {
    const plan = planProject({
      projectId: "test-security",
      prompt: "Train a model that detects OWASP bugs in a codebase and explains fixes.",
    })

    expect(plan.kind).toBe("owasp_security")
    expect(plan.modelGoal.generatedActions.map((action) => action.id)).toEqual(
      expect.arrayContaining(["scan-codebase", "secure-checklist"])
    )
    expect(plan.modelGoal.generatedActions.map((action) => action.id)).not.toContain("generate-paper")
  })

  it("falls back to generic expert actions for unknown domains", () => {
    const plan = planProject({
      projectId: "test-generic",
      prompt: "Build an expert assistant for woodworking shop safety procedures.",
    })

    expect(plan.kind).toBe("generic")
    expect(plan.modelGoal.generatedActions.map((action) => action.id)).toEqual(
      expect.arrayContaining(["answer-with-sources", "create-lesson", "create-eval-questions"])
    )
  })
})
