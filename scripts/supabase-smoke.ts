import { loadEnvConfig } from "@next/env"

async function main() {
  loadEnvConfig(process.cwd())

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

  const { error: tableError } = await client
    .from("castgenie_projects")
    .select("id", { count: "exact", head: true })

  if (tableError) {
    throw new Error(
      `Supabase migration is not ready. Apply supabase/migrations/202606190001_wave15_core.sql. Original error: ${tableError.message}`
    )
  }

  const { count: queuedCount, error: queuedError } = await client
    .from("castgenie_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued")

  if (queuedError) {
    throw new Error(`Unable to inspect Supabase queue. Original error: ${queuedError.message}`)
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
    throw new Error(
      `Supabase job RPC is not ready. Apply supabase/migrations/202606190001_wave15_core.sql. Original error: ${rpcError.message}`
    )
  }

  console.log("Supabase Wave 15 schema ok.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown Supabase smoke failure")
  process.exitCode = 1
})
