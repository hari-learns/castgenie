import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("request-bound build guard", () => {
  it("keeps project creation and rebuild routes off the synchronous build runner", async () => {
    const files = await Promise.all([
      readFile(path.join(root, "src/app/api/projects/route.ts"), "utf8"),
      readFile(
        path.join(root, "src/app/api/projects/[projectId]/build/route.ts"),
        "utf8"
      ),
      readFile(
        path.join(root, "src/app/api/projects/[projectId]/sources/route.ts"),
        "utf8"
      ),
    ])

    for (const file of files) {
      expect(file).not.toContain("runBuildJob")
      expect(file).not.toContain("maybeAutoLaunchCastformRun")
    }
  })
})
