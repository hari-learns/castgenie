import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("product truthfulness UI copy", () => {
  it("labels the default workspace chat as hosted-model chat", async () => {
    const page = await readFile(
      path.join(root, "src/app/projects/[projectId]/page.tsx"),
      "utf8"
    )

    expect(page).toContain("Chat with trained model")
    expect(page).toContain("The main chat is reserved for the hosted Castform-trained")
    expect(page).toContain("Preview responses are available only as preview/debug")
  })

  it("keeps non-Castform providers explicitly labeled as preview", async () => {
    const assistant = await readFile(
      path.join(root, "src/components/projects/project-assistant.tsx"),
      "utf8"
    )

    expect(assistant).toContain("Gemini preview")
    expect(assistant).toContain("Mock preview")
  })
})
