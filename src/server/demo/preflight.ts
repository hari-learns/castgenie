import { execFile } from "node:child_process"
import { readdir } from "node:fs/promises"
import path from "node:path"

import { projectsRoot } from "@/lib/paths"
import { readJson } from "@/lib/storage"
import { getSupabaseAdminClient, hasSupabaseConfig, isSupabaseStorageEnabled } from "@/server/supabase/client"
import type { BuildJob } from "@/types/jobs"

export type DemoPreflightCheck = {
  id: string
  label: string
  status: "pass" | "warn" | "fail"
  message: string
  details?: Record<string, unknown>
}

export type DemoPreflightReport = {
  ok: boolean
  generatedAt: string
  checks: DemoPreflightCheck[]
  summary: {
    failed: number
    warnings: number
    queuedJobs: number
    failedJobs: number
  }
}

const secretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CASTFORM_API_KEY",
  "EXA_API_KEY",
  "FIRECRAWL_API_KEY",
  "GEMINI_API_KEY",
]

export function redactSecrets(value: string) {
  return secretNames.reduce((text, name) => {
    const secret = process.env[name]
    return secret ? text.replaceAll(secret, "[REDACTED]") : text
  }, value)
}

function maskedPresence(name: string) {
  const value = process.env[name]
  if (!value) return "missing"
  return `present:${value.length}chars`
}

function check(id: string, label: string, status: DemoPreflightCheck["status"], message: string, details?: Record<string, unknown>): DemoPreflightCheck {
  return { id, label, status, message: redactSecrets(message), details }
}

async function inspectLocalJobs() {
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => [])
  let queuedJobs = 0
  let failedJobs = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const projectId = entry.name
    const candidates = [
      path.join(projectsRoot, projectId, "jobs", "latest.json"),
      path.join(projectsRoot, projectId, "castform", "jobs", "latest_train_job.json"),
    ]

    for (const candidate of candidates) {
      const job = await readJson<BuildJob>(candidate).catch(() => null)
      if (job?.status === "queued") queuedJobs += 1
      if (job?.status === "failed") failedJobs += 1
    }
  }

  return { queuedJobs, failedJobs }
}

function execFileText(command: string, args: string[], timeout = 20_000) {
  return new Promise<string>((resolve, reject) => {
    execFile(command, args, { timeout, maxBuffer: 1024 * 256 }, (error, stdout, stderr) => {
      const output = redactSecrets(`${stdout}${stderr}`.trim())
      if (error) {
        reject(new Error(output || error.message))
        return
      }
      resolve(output)
    })
  })
}

async function checkSupabase(): Promise<{
  check: DemoPreflightCheck
  queuedJobs: number
  failedJobs: number
}> {
  if (!isSupabaseStorageEnabled()) {
    const local = await inspectLocalJobs()
    return {
      check: check(
        "supabase",
        "Supabase metadata",
        "warn",
        "CASTGENIE_STORAGE_MODE is not supabase; using local metadata fallback.",
        local
      ),
      ...local,
    }
  }

  if (!hasSupabaseConfig()) {
    return {
      check: check(
        "supabase",
        "Supabase metadata",
        "fail",
        "Supabase mode is enabled but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
      ),
      queuedJobs: 0,
      failedJobs: 0,
    }
  }

  const client = getSupabaseAdminClient()
  if (!client) {
    return {
      check: check("supabase", "Supabase metadata", "fail", "Unable to create Supabase admin client."),
      queuedJobs: 0,
      failedJobs: 0,
    }
  }

  const { error: tableError } = await client
    .from("castgenie_projects")
    .select("id", { count: "exact", head: true })

  if (tableError) {
    return {
      check: check(
        "supabase",
        "Supabase metadata",
        "fail",
        `Supabase Wave 15 schema is not ready: ${tableError.message}`
      ),
      queuedJobs: 0,
      failedJobs: 0,
    }
  }

  const { count: queuedCount, error: queuedError } = await client
    .from("castgenie_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued")

  const { count: failedCount, error: failedError } = await client
    .from("castgenie_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")

  if (queuedError || failedError) {
    return {
      check: check(
        "supabase",
        "Supabase metadata",
        "fail",
        `Unable to inspect Supabase jobs: ${queuedError?.message ?? failedError?.message}`
      ),
      queuedJobs: 0,
      failedJobs: 0,
    }
  }

  const queuedJobs = queuedCount ?? 0
  const failedJobs = failedCount ?? 0
  const status = queuedJobs > 0 ? "warn" : "pass"
  return {
    check: check(
      "supabase",
      "Supabase metadata",
      status,
      queuedJobs > 0
        ? `Supabase schema is ready, but ${queuedJobs} queued job(s) exist. Run the worker before demo:real.`
        : "Supabase schema and job table are reachable.",
      { queuedJobs, failedJobs }
    ),
    queuedJobs,
    failedJobs,
  }
}

async function checkExa(): Promise<DemoPreflightCheck> {
  if (!process.env.EXA_API_KEY) {
    return check("exa", "Exa source discovery", "warn", "EXA_API_KEY is missing. Real web discovery will fall back or block demo:real.")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify({
        query: "SEBI LODR official compliance officer regulation 6",
        type: "auto",
        includeDomains: ["sebi.gov.in"],
        numResults: 1,
        contents: { highlights: true },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return check("exa", "Exa source discovery", "fail", `Exa smoke request failed with ${response.status}.`)
    }

    return check("exa", "Exa source discovery", "pass", "Exa search endpoint accepted the SEBI allowed-domain smoke request.")
  } catch (error) {
    return check(
      "exa",
      "Exa source discovery",
      "fail",
      error instanceof Error ? `Exa smoke request failed: ${error.message}` : "Exa smoke request failed."
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function checkPythonBenchmax(): Promise<DemoPreflightCheck> {
  const pythonBin = process.env.CASTFORM_PYTHON_BIN || "python3.12"

  try {
    await execFileText(pythonBin, ["-c", "import benchmax; print('benchmax ok')"], 30_000)
    return check("benchmax", "Castform Python runtime", "pass", `${pythonBin} can import benchmax.`)
  } catch (error) {
    return check(
      "benchmax",
      "Castform Python runtime",
      "fail",
      error instanceof Error
        ? `${pythonBin} cannot import benchmax: ${error.message}`
        : `${pythonBin} cannot import benchmax.`
    )
  }
}

export async function runDemoPreflight(options: { checkExaNetwork?: boolean; checkBenchmax?: boolean } = {}): Promise<DemoPreflightReport> {
  const checks: DemoPreflightCheck[] = [
    check("mock_mode", "Runtime mode", process.env.MOCK_MODE === "true" ? "warn" : "pass", `MOCK_MODE=${process.env.MOCK_MODE ?? "unset"}`),
    check("storage_mode", "Storage mode", process.env.CASTGENIE_STORAGE_MODE === "supabase" ? "pass" : "warn", `CASTGENIE_STORAGE_MODE=${process.env.CASTGENIE_STORAGE_MODE ?? "local"}`),
    check("env_presence", "Secret presence", "pass", "Required secret names checked without printing values.", {
      NEXT_PUBLIC_SUPABASE_URL: maskedPresence("NEXT_PUBLIC_SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: maskedPresence("SUPABASE_SERVICE_ROLE_KEY"),
      EXA_API_KEY: maskedPresence("EXA_API_KEY"),
      CASTFORM_API_KEY: maskedPresence("CASTFORM_API_KEY"),
      GEMINI_API_KEY: maskedPresence("GEMINI_API_KEY"),
    }),
    check("castform_flags", "Castform flags", process.env.CASTFORM_REAL_RUNS_ENABLED === "true" && process.env.CASTFORM_AUTO_LAUNCH === "true" ? "pass" : "warn", `CASTFORM_REAL_RUNS_ENABLED=${process.env.CASTFORM_REAL_RUNS_ENABLED ?? "unset"}, CASTFORM_AUTO_LAUNCH=${process.env.CASTFORM_AUTO_LAUNCH ?? "unset"}`),
  ]

  const supabase = await checkSupabase()
  checks.push(supabase.check)
  checks.push(options.checkBenchmax === false ? check("benchmax", "Castform Python runtime", "warn", "Benchmax smoke skipped by caller.") : await checkPythonBenchmax())
  checks.push(options.checkExaNetwork === false ? check("exa", "Exa source discovery", "warn", "Exa network smoke skipped by caller.") : await checkExa())

  const failed = checks.filter((item) => item.status === "fail").length
  const warnings = checks.filter((item) => item.status === "warn").length

  return {
    ok: failed === 0,
    generatedAt: new Date().toISOString(),
    checks,
    summary: {
      failed,
      warnings,
      queuedJobs: supabase.queuedJobs,
      failedJobs: supabase.failedJobs,
    },
  }
}
