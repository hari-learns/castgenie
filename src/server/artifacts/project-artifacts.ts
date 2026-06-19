import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

import { projectRoot } from "@/lib/paths"
import type {
  ArtifactBrowserData,
  ArtifactFile,
  ArtifactGroup,
  ArtifactPreviewRecord,
} from "@/types/artifact-browser"

const previewPaths = [
  "domain_spec.json",
  "domain_graph.json",
  "source_manifest.json",
  "chunks.jsonl",
  "datasets/train_qa.jsonl",
  "datasets/eval_qa.jsonl",
  "datasets/action_tasks.jsonl",
  "rewards/reward_spec.json",
  "castform_project/README.md",
  "castform_project/config.yaml",
]

const excludedNames = new Set([".env", ".env.local", ".env.production"])
const textExtensions = new Set([
  ".json",
  ".jsonl",
  ".md",
  ".txt",
  ".yaml",
  ".yml",
  ".py",
  ".log",
])

function projectPath(projectId: string) {
  return path.resolve(projectRoot(projectId))
}

function assertSafeRelativePath(relativePath: string) {
  const segments = relativePath.split(/[\\/]/)

  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    segments.includes("..") ||
    segments.some((segment) => segment.startsWith(".env"))
  ) {
    throw new Error("Unsafe artifact path")
  }
}

export function safeProjectArtifactPath(projectId: string, relativePath: string) {
  assertSafeRelativePath(relativePath)

  const root = projectPath(projectId)
  const resolved = path.resolve(root, relativePath)

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Artifact path escapes project root")
  }

  return resolved
}

function groupFor(relativePath: string): ArtifactGroup {
  if (relativePath === "manifest.json" || relativePath.endsWith("_spec.json")) return "manifest"
  if (relativePath.startsWith("imports/")) return "imports"
  if (relativePath.includes("source") || relativePath === "sources.jsonl") return "sources"
  if (relativePath.startsWith("documents/") || relativePath === "chunks.jsonl") return "corpus"
  if (relativePath.startsWith("datasets/")) return "datasets"
  if (relativePath.startsWith("rewards/")) return "rewards"
  if (relativePath.startsWith("logs/") || relativePath.startsWith("jobs/")) return "logs"
  if (relativePath.startsWith("castform_project/")) return "castform_project"
  return "other"
}

function isPreviewable(relativePath: string) {
  return textExtensions.has(path.extname(relativePath))
}

async function walkFiles(root: string, current = root): Promise<ArtifactFile[]> {
  const entries = await readdir(current, { withFileTypes: true }).catch(() => [])
  const files = await Promise.all(
    entries
      .filter((entry) => !excludedNames.has(entry.name) && !entry.name.startsWith(".env"))
      .map(async (entry) => {
        const fullPath = path.join(current, entry.name)
        const relativePath = path.relative(root, fullPath).split(path.sep).join("/")

        if (entry.isDirectory()) {
          return walkFiles(root, fullPath)
        }

        if (!entry.isFile()) {
          return []
        }

        const info = await stat(fullPath)
        return [
          {
            path: relativePath,
            name: entry.name,
            group: groupFor(relativePath),
            size: info.size,
            updatedAt: info.mtime.toISOString(),
            previewable: isPreviewable(relativePath),
          },
        ]
      })
  )

  return files.flat().toSorted((a, b) => a.path.localeCompare(b.path))
}

export async function listProjectArtifactFiles(projectId: string) {
  return walkFiles(projectPath(projectId))
}

export async function readProjectArtifactBuffer(projectId: string, relativePath: string) {
  const fullPath = safeProjectArtifactPath(projectId, relativePath)
  return readFile(fullPath)
}

export async function readProjectArtifactPreview(
  projectId: string,
  relativePath: string,
  maxCharacters = 6000
): Promise<ArtifactPreviewRecord> {
  try {
    const buffer = await readProjectArtifactBuffer(projectId, relativePath)
    const content = buffer.toString("utf8")

    return {
      path: relativePath,
      content:
        content.length > maxCharacters
          ? `${content.slice(0, maxCharacters)}\n...`
          : content,
      exists: true,
      truncated: content.length > maxCharacters,
    }
  } catch {
    return {
      path: relativePath,
      content: "Not generated yet.",
      exists: false,
      truncated: false,
    }
  }
}

export async function getArtifactBrowserData(projectId: string): Promise<ArtifactBrowserData> {
  const [files, previews] = await Promise.all([
    listProjectArtifactFiles(projectId),
    Promise.all(previewPaths.map((previewPath) => readProjectArtifactPreview(projectId, previewPath))),
  ])

  return { files, previews }
}

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2)
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate()

  return { dosTime, dosDate }
}

function localFileHeader(name: Buffer, data: Buffer, crc: number) {
  const { dosTime, dosDate } = dosDateTime()
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(0, 6)
  header.writeUInt16LE(0, 8)
  header.writeUInt16LE(dosTime, 10)
  header.writeUInt16LE(dosDate, 12)
  header.writeUInt32LE(crc, 14)
  header.writeUInt32LE(data.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(name.length, 26)
  header.writeUInt16LE(0, 28)
  return header
}

function centralDirectoryHeader(name: Buffer, data: Buffer, crc: number, offset: number) {
  const { dosTime, dosDate } = dosDateTime()
  const header = Buffer.alloc(46)
  header.writeUInt32LE(0x02014b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(20, 6)
  header.writeUInt16LE(0, 8)
  header.writeUInt16LE(0, 10)
  header.writeUInt16LE(dosTime, 12)
  header.writeUInt16LE(dosDate, 14)
  header.writeUInt32LE(crc, 16)
  header.writeUInt32LE(data.length, 20)
  header.writeUInt32LE(data.length, 24)
  header.writeUInt16LE(name.length, 28)
  header.writeUInt16LE(0, 30)
  header.writeUInt16LE(0, 32)
  header.writeUInt16LE(0, 34)
  header.writeUInt16LE(0, 36)
  header.writeUInt32LE(0, 38)
  header.writeUInt32LE(offset, 42)
  return header
}

function endOfCentralDirectory(entryCount: number, centralSize: number, centralOffset: number) {
  const footer = Buffer.alloc(22)
  footer.writeUInt32LE(0x06054b50, 0)
  footer.writeUInt16LE(0, 4)
  footer.writeUInt16LE(0, 6)
  footer.writeUInt16LE(entryCount, 8)
  footer.writeUInt16LE(entryCount, 10)
  footer.writeUInt32LE(centralSize, 12)
  footer.writeUInt32LE(centralOffset, 16)
  footer.writeUInt16LE(0, 20)
  return footer
}

export async function buildProjectZip(projectId: string) {
  const files = await listProjectArtifactFiles(projectId)
  const selected = files.filter(
    (file) =>
      file.path.startsWith("castform_project/") ||
      [
        "manifest.json",
        "domain_spec.json",
        "domain_graph.json",
        "source_manifest.json",
        "chunks.jsonl",
        "datasets/train_qa.jsonl",
        "datasets/eval_qa.jsonl",
        "datasets/action_tasks.jsonl",
        "rewards/reward_spec.json",
      ].includes(file.path)
  )
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  for (const file of selected) {
    const data = await readProjectArtifactBuffer(projectId, file.path)
    const name = Buffer.from(file.path)
    const crc = crc32(data)
    const localHeader = localFileHeader(name, data, crc)
    localParts.push(localHeader, name, data)
    centralParts.push(centralDirectoryHeader(name, data, crc, offset), name)
    offset += localHeader.length + name.length + data.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((size, part) => size + part.length, 0)
  return Buffer.concat([
    ...localParts,
    ...centralParts,
    endOfCentralDirectory(selected.length, centralSize, centralOffset),
  ])
}

export function downloadName(projectId: string, relativePath: string) {
  return `${projectId}-${relativePath.split("/").join("-")}`
}
