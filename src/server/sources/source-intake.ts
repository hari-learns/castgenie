import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { nanoid } from "nanoid"

import { projectArtifactPath, projectRoot } from "@/lib/paths"
import { readJson, writeArtifactJson } from "@/lib/storage"
import type {
  SourceConfig,
  UploadManifest,
  UploadParseReport,
  UploadedSourceFile,
  UploadedSourceKind,
} from "@/types/source-intake"

export const uploadLimits = {
  maxFiles: Number(process.env.MAX_UPLOAD_FILES ?? 8),
  maxFileBytes: Number(process.env.MAX_UPLOAD_FILE_BYTES ?? 2 * 1024 * 1024),
  maxTotalBytes: Number(process.env.MAX_UPLOAD_TOTAL_BYTES ?? 8 * 1024 * 1024),
}

const parseableExtensions = new Set([".txt", ".md", ".json", ".jsonl", ".csv"])
const acceptedExtensions = new Set([...parseableExtensions, ".pdf"])

type PersistUploadsInput = {
  projectId: string
  files: File[]
  sourceConfig: Omit<
    SourceConfig,
    "uploadedFileCount" | "parseableFileCount" | "skippedFileCount" | "warnings" | "updatedAt"
  >
}

export type ParsedUploadDocument = {
  upload: UploadedSourceFile
  title: string
  text: string
}

export function defaultSourceConfig(input?: {
  vertical?: string
  allowedDomains?: string
  maxSources?: number
  permissionAttested?: boolean
}): SourceConfig {
  return {
    vertical: input?.vertical,
    allowedDomains: input?.allowedDomains,
    maxSources: input?.maxSources ?? Number(process.env.MAX_SOURCES ?? 12),
    permissionAttested: input?.permissionAttested ?? false,
    uploadedFileCount: 0,
    parseableFileCount: 0,
    skippedFileCount: 0,
    warnings: [],
    updatedAt: new Date().toISOString(),
  }
}

function projectUploadPath(projectId: string, ...segments: string[]) {
  const root = path.resolve(projectRoot(projectId))
  const resolved = path.resolve(root, "uploads", ...segments)

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Upload path escapes project root")
  }

  return resolved
}

function extensionFor(name: string) {
  return path.extname(name).toLowerCase()
}

export function sanitizeUploadName(name: string) {
  const base = path.basename(name).normalize("NFKD")

  if (!base || base.startsWith(".env") || base.includes("\0")) {
    throw new Error("Unsafe upload filename")
  }

  const sanitized = base
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "_")
    .slice(0, 120)

  if (!sanitized || sanitized.startsWith(".") || sanitized.includes("..")) {
    throw new Error("Unsafe upload filename")
  }

  return sanitized
}

function kindForExtension(extension: string): UploadedSourceKind {
  if (extension === ".txt") return "text"
  if (extension === ".md") return "markdown"
  if (extension === ".json") return "json"
  if (extension === ".jsonl") return "jsonl"
  if (extension === ".csv") return "csv"
  if (extension === ".pdf") return "pdf"
  return "unsupported"
}

function uploadRecord(input: {
  file: File
  originalName: string
  storedName: string
  relativePath: string
  warning?: string
}): UploadedSourceFile {
  const extension = extensionFor(input.originalName)
  const kind = kindForExtension(extension)
  const isParseable = parseableExtensions.has(extension)
  const isPdf = extension === ".pdf"

  return {
    id: `upload_${nanoid(10)}`,
    originalName: input.originalName,
    storedName: input.storedName,
    relativePath: input.relativePath,
    mediaType: input.file.type || "application/octet-stream",
    extension,
    size: input.file.size,
    kind,
    status: isParseable ? "parsed" : "stored_skipped",
    parseStatus: isParseable
      ? "parsed"
      : isPdf
        ? "skipped_pdf"
        : "skipped_unsupported",
    warning:
      input.warning ??
      (isPdf
        ? "PDF stored but skipped. Wave 7 does not extract PDFs to avoid low-quality training text."
        : isParseable
          ? undefined
          : "Unsupported file type stored but skipped."),
    createdAt: new Date().toISOString(),
  }
}

function summarize(sourceConfig: PersistUploadsInput["sourceConfig"], files: UploadedSourceFile[]): UploadManifest {
  const warnings = files.flatMap((file) => (file.warning ? [file.warning] : []))

  return {
    projectId: "",
    sourceConfig: {
      ...sourceConfig,
      uploadedFileCount: files.length,
      parseableFileCount: files.filter((file) => file.status === "parsed").length,
      skippedFileCount: files.filter((file) => file.status !== "parsed").length,
      warnings: [...new Set(warnings)],
      updatedAt: new Date().toISOString(),
    },
    files,
  }
}

export async function persistUploadedSources(input: PersistUploadsInput) {
  const safeFiles = input.files.filter((file) => file.size > 0)
  const existing = await readUploadManifest(input.projectId)
  const existingFiles = existing?.files ?? []

  if (safeFiles.length === 0) {
    const manifest: UploadManifest = {
      projectId: input.projectId,
      sourceConfig: {
        ...defaultSourceConfig({
          ...existing?.sourceConfig,
          ...input.sourceConfig,
        }),
        ...input.sourceConfig,
        uploadedFileCount: existingFiles.length,
        parseableFileCount: existingFiles.filter((file) => file.status === "parsed").length,
        skippedFileCount: existingFiles.filter((file) => file.status !== "parsed").length,
      },
      files: existingFiles,
    }
    await writeArtifactJson(input.projectId, "uploads/upload_manifest.json", manifest)
    return manifest
  }

  if (existingFiles.length + safeFiles.length > uploadLimits.maxFiles) {
    throw new Error(`Upload limit exceeded. Maximum ${uploadLimits.maxFiles} files are allowed.`)
  }

  const totalBytes =
    existingFiles.reduce((sum, file) => sum + file.size, 0) +
    safeFiles.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > uploadLimits.maxTotalBytes) {
    throw new Error(`Upload limit exceeded. Maximum total size is ${uploadLimits.maxTotalBytes} bytes.`)
  }

  const uploadDir = projectUploadPath(input.projectId, "files")
  await mkdir(uploadDir, { recursive: true })

  const records: UploadedSourceFile[] = []

  for (const file of safeFiles) {
    if (file.size > uploadLimits.maxFileBytes) {
      throw new Error(`${file.name} exceeds the ${uploadLimits.maxFileBytes} byte per-file limit.`)
    }

    const safeName = sanitizeUploadName(file.name)
    const extension = extensionFor(safeName)

    if (!acceptedExtensions.has(extension)) {
      throw new Error(`${safeName} is not an accepted Wave 7 source file type.`)
    }

    const storedName = `${String(existingFiles.length + records.length + 1).padStart(2, "0")}-${nanoid(6)}-${safeName}`
    const relativePath = `uploads/files/${storedName}`
    const fullPath = projectUploadPath(input.projectId, "files", storedName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)
    records.push(
      uploadRecord({
        file,
        originalName: safeName,
        storedName,
        relativePath,
      })
    )
  }

  const manifest = summarize(input.sourceConfig, [...existingFiles, ...records])
  manifest.projectId = input.projectId
  await writeArtifactJson(input.projectId, "uploads/upload_manifest.json", manifest)
  return manifest
}

export async function readUploadManifest(projectId: string) {
  try {
    return await readJson<UploadManifest>(
      projectArtifactPath(projectId, "uploads", "upload_manifest.json")
    )
  } catch {
    return null
  }
}

function stringifyJson(value: unknown, depth = 0): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item, index) => `Item ${index + 1}: ${stringifyJson(item, depth + 1)}`)
      .join("\n")
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 80)
      .map(([key, item]) => `${key}: ${depth > 1 ? JSON.stringify(item) : stringifyJson(item, depth + 1)}`)
      .join("\n")
  }
  return ""
}

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(Boolean).slice(0, 200)
  if (lines.length === 0) return ""
  const headers = lines[0].split(",").map((value) => value.trim())
  return lines
    .slice(1)
    .map((line, index) => {
      const cells = line.split(",").map((value) => value.trim())
      const fields = headers
        .map((header, cellIndex) => `${header || `column_${cellIndex + 1}`}: ${cells[cellIndex] ?? ""}`)
        .join("\n")
      return `Row ${index + 1}\n${fields}`
    })
    .join("\n\n")
}

function normalizeUploadText(upload: UploadedSourceFile, content: string) {
  if (upload.extension === ".json") {
    return stringifyJson(JSON.parse(content))
  }

  if (upload.extension === ".jsonl") {
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 200)
      .map((line, index) => `Record ${index + 1}\n${stringifyJson(JSON.parse(line))}`)
      .join("\n\n")
  }

  if (upload.extension === ".csv") {
    return parseCsv(content)
  }

  return content
}

export async function parseUploadedDocuments(projectId: string): Promise<{
  manifest: UploadManifest | null
  documents: ParsedUploadDocument[]
  report: UploadParseReport | null
}> {
  const manifest = await readUploadManifest(projectId)

  if (!manifest) {
    return { manifest: null, documents: [], report: null }
  }

  const documents: ParsedUploadDocument[] = []
  const warnings: string[] = [...manifest.sourceConfig.warnings]

  for (const upload of manifest.files) {
    if (upload.status !== "parsed") {
      continue
    }

    try {
      const raw = await readFile(projectArtifactPath(projectId, upload.relativePath), "utf8")
      const text = normalizeUploadText(upload, raw).trim()

      if (!text) {
        warnings.push(`${upload.originalName} parsed to empty text and was skipped.`)
        continue
      }

      documents.push({
        upload,
        title: upload.originalName.replace(/\.[^.]+$/, ""),
        text: [
          `## Uploaded source: ${upload.originalName}`,
          `File type: ${upload.extension}`,
          `Permission attested: ${manifest.sourceConfig.permissionAttested ? "yes" : "no"}`,
          "",
          text,
        ].join("\n"),
      })
    } catch (error) {
      warnings.push(
        `${upload.originalName} could not be parsed: ${
          error instanceof Error ? error.message : "unknown parse error"
        }`
      )
    }
  }

  const report: UploadParseReport = {
    adapterId: "uploaded-file",
    parsedFiles: documents.length,
    skippedFiles: manifest.files.filter((file) => file.status === "stored_skipped").length,
    rejectedFiles: manifest.files.filter((file) => file.status === "rejected").length,
    generatedDocuments: documents.length,
    warnings: [...new Set(warnings)],
    files: manifest.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      status: file.status,
      parseStatus: file.parseStatus,
      warning: file.warning,
    })),
  }

  return { manifest, documents, report }
}
