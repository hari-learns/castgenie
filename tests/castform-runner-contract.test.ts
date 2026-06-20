import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Castform Python runner contract", () => {
  it("supports preflight, validate, launch, and status without embedded secrets", async () => {
    const script = await readFile(path.join(root, "scripts/castform_runner.py"), "utf8")

    expect(script).toContain('choices=["preflight", "validate", "launch", "status"]')
    expect(script).toContain("def preflight")
    expect(script).toContain("def validate")
    expect(script).toContain("def launch")
    expect(script).toContain("def status")
    expect(script).not.toContain("sk-or-")
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })

  it("keeps benchmax imports inside runtime functions", async () => {
    const script = await readFile(path.join(root, "scripts/castform_runner.py"), "utf8")
    const importFunctionIndex = script.indexOf("def import_benchmax")
    const benchmaxImportIndex = script.indexOf("from benchmax.platform.client import TrainerClient")

    expect(importFunctionIndex).toBeGreaterThan(0)
    expect(benchmaxImportIndex).toBeGreaterThan(importFunctionIndex)
  })

  it("passes generated Python module objects to Castform local_modules", async () => {
    const script = await readFile(path.join(root, "scripts/castform_runner.py"), "utf8")

    expect(script).toContain("def import_workspace_modules")
    expect(script).toContain('"local_modules": local_modules')
    expect(script).not.toContain('"local_modules": [str(')
  })
})
