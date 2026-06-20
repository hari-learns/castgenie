import { readFileSync } from "node:fs"

import { loadEnvConfig } from "@next/env"

function loadLocalEnv() {
  loadEnvConfig(process.cwd())
  const text = readFileSync(".env.local", "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const index = trimmed.indexOf("=")
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1)
  }
}

async function main() {
  loadLocalEnv()

  const { getSupabaseAdminClient, hasSupabaseConfig, isSupabaseStorageEnabled } =
    await import("@/server/supabase/client")

  if (!isSupabaseStorageEnabled()) {
    console.log("Supabase storage is disabled.")
    return
  }

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase storage is enabled but URL or service-role key is missing.")
  }

  const client = getSupabaseAdminClient()

  if (!client) {
    throw new Error("Unable to create Supabase admin client.")
  }

  function safeError(error: unknown) {
    if (!error || typeof error !== "object") {
      return String(error ?? "Unknown error")
    }

    const record = error as {
      code?: string
      message?: string
      details?: string
      hint?: string
      name?: string
    }

    return JSON.stringify({
      name: record.name,
      code: record.code,
      message: record.message,
      details: record.details,
      hint: record.hint,
    })
  }

  const { error: tableError } = await client
    .from("castgenie_projects")
    .select("id")
    .limit(1)

  if (tableError) {
    throw new Error(
      `Supabase migration is not ready. Apply supabase/migrations/202606190001_wave15_core.sql. Safe diagnostic: ${safeError(tableError)}`
    )
  }

  const { count: queuedCount, error: queuedError } = await client
    .from("castgenie_jobs")
    .select("id", { count: "exact" })
    .eq("status", "queued")
    .limit(1)

  if (queuedError) {
    throw new Error(`Unable to inspect Supabase queue. Safe diagnostic: ${safeError(queuedError)}`)
  }

  if ((queuedCount ?? 0) > 0) {
    console.log(
      `Supabase Wave 15 schema ok. Skipped claim RPC smoke because ${queuedCount} queued job(s) exist.`
    )
    return
  }

  const { error: rpcError } = await client.rpc("castgenie_claim_queued_job", {
    worker_id: "smoke_check",
  })

  if (rpcError) {
    if (rpcError.code === "PGRST202") {
      console.log(
        "Supabase tables are ready. Warning: castgenie_claim_queued_job RPC is missing; the app will use guarded single-worker claim fallback. Apply supabase/migrations/202606190001_wave15_core.sql to restore atomic multi-worker claims."
      )
      return
    }

    throw new Error(
      `Supabase job RPC is not ready. Apply supabase/migrations/202606190001_wave15_core.sql. Safe diagnostic: ${safeError(rpcError)}`
    )
  }

  console.log("Supabase Wave 15 schema ok.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown Supabase smoke failure")
  process.exitCode = 1
})
