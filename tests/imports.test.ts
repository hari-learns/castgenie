import { describe, expect, it } from "vitest"

import { runDomainImport } from "@/server/imports/domain-import"

describe("runDomainImport", () => {
  it("selects the CA fixture adapter in mock CA projects", async () => {
    const bundle = await runDomainImport({
      projectId: "test-ca-import",
      prompt: "CA Advanced Accounting paper generator",
      domainKind: "ca_edtech",
      sourceKinds: ["synthetic_seed", "wire_neurons_json"],
      mockMode: true,
      allowWebDiscovery: true,
      limits: {
        maxSources: 6,
        maxChunks: 50,
        maxQaPairs: 20,
      },
    })

    expect(bundle.adapterId).toBe("wire-neurons-ca-fixture")
    expect(bundle.summary.strategy).toBe("wire_neurons_fixture")
    expect(bundle.sources.length).toBeGreaterThan(1)
    expect(bundle.summary.warnings.join(" ")).toContain("synthetic")
  })

  it("selects the codebase placeholder for OWASP projects", async () => {
    const bundle = await runDomainImport({
      projectId: "test-security-import",
      prompt: "OWASP scanner",
      domainKind: "owasp_security",
      sourceKinds: ["codebase"],
      mockMode: true,
      allowWebDiscovery: true,
      limits: {
        maxSources: 6,
        maxChunks: 50,
        maxQaPairs: 20,
      },
    })

    expect(bundle.adapterId).toBe("codebase-placeholder")
    expect(bundle.summary.strategy).toBe("codebase_placeholder")
    expect(bundle.summary.warnings.join(" ")).toContain("placeholder")
  })
})
