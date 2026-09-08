import * as FS from "fs"
import * as PATH from "path"
import * as BUN from "bun"
import { pullCatalog, writeCatalog } from "./pull-catalog"

// Paths
const SYNCED_CATALOG_PATH = PATH.join(
  import.meta.dirname,
  "../../catalog/free-models-catalog.json"
)
const GIT_DIR = PATH.resolve(import.meta.dirname, "../../.git")
const LAST_SYNC_PATH = PATH.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".aazadi",
  "last-sync.json"
)

// Ensure .aazadi directory exists
const AAZADI_DIR = PATH.dirname(LAST_SYNC_PATH)
if (!FS.existsSync(AAZADI_DIR)) {
  FS.mkdirSync(AAZADI_DIR, { recursive: true })
}

// Default last sync record
const defaultLastSync = {
  timestamp: 0,
  status: "never",
}

// Interface for last sync tracking
interface LastSyncRecord {
  timestamp: number
  catalogVersion?: string
  status: "success" | "failed" | "never"
}

/**
 * Git operations: add, commit (ignores "nothing to commit"), push to origin main.
 * Every git call is bounded by a timeout so a hung git/credential prompt
 * (e.g. during a headless sync) can never block the process indefinitely.
 * Runs git via Bun.spawn so the child process can be killed on timeout.
 * Never throws.
 */
const GIT_TIMEOUT_MS = Number(process.env.AAZADI_GIT_TIMEOUT_MS || 30_000)

async function runGit(repoRoot: string, args: string[]): Promise<string> {
  const proc = BUN.spawn(["git", "-C", repoRoot, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const timer = setTimeout(() => proc.kill(), GIT_TIMEOUT_MS)
  try {
    const exitCode = await proc.exited
    const stdout = new TextDecoder().decode(await new Response(proc.stdout).arrayBuffer())
    const stderr = new TextDecoder().decode(await new Response(proc.stderr).arrayBuffer())
    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `git ${args[0] ?? ""} exited with code ${exitCode}`)
    }
    return stdout.trim()
  } finally {
    clearTimeout(timer)
  }
}

async function gitAddCommitPush(repoRoot: string, message: string): Promise<{ pushed: boolean; committed: boolean }> {
  let committed = false
  let pushed = false
  try {
    await runGit(repoRoot, ["add", "catalog/free-models-catalog.json"])
  } catch (error: any) {
    console.warn(`⚠️ Git add failed: ${error.message || error}`)
    return { pushed: false, committed: false }
  }

  try {
    const output = await runGit(repoRoot, ["commit", "-m", message])
    console.log(`📝 Git commit: ${output}`)
    committed = true
  } catch {
    console.log("📝 Git commit: no changes to commit")
  }

  try {
    const output = await runGit(repoRoot, ["push", "origin", "main"])
    console.log(`📡 Git push: ${output}`)
    pushed = true
  } catch (pushError: any) {
    console.warn(`⚠️ Git push skipped: ${pushError.message || "unknown error"}`)
    console.warn("   Run: bun run sync:push to push manually")
  }

  return { pushed, committed }
}

/**
 * Monthly sync: pulls catalog, writes it, commits and pushes to git.
 */
export async function refreshFreeModels(): Promise<{
  success: boolean
  catalog?: any
  error?: string
  gitPushed?: boolean
  lastSyncUpdated?: boolean
}> {
  try {
    // 1. Produce the catalog (pull from source with known-models fallback)
    let catalog: any
    const now = Date.now()

    try {
      catalog = await pullCatalog()
      await writeCatalog(catalog)
    } catch (pullError: any) {
      // Final fallback: keep existing synced catalog if present
      if (await BUN.file(SYNCED_CATALOG_PATH).exists()) {
        catalog = JSON.parse(await BUN.file(SYNCED_CATALOG_PATH).text())
        console.log(`📦 Using existing catalog: ${catalog.modelCount} models (${catalog.curatedAt})`)
      } else {
        throw pullError
      }
    }

    // 2. Git operations - commit and push to user's repo
    let gitPushed = false

    if (FS.existsSync(GIT_DIR)) {
      const result = await gitAddCommitPush(
        PATH.dirname(GIT_DIR),
        "chore: update free models catalog [auto]"
      )
      gitPushed = result.pushed
    } else {
      console.warn("⚠️ No git repository found, skipping git operations")
      return { success: true, catalog, gitPushed: false }
    }

    // 3. Update last sync record
    const lastSyncRecord: LastSyncRecord = {
      timestamp: now,
      catalogVersion: catalog.curatedAt,
      status: "success",
    }

    const aazadiDir = PATH.dirname(LAST_SYNC_PATH)
    if (!FS.existsSync(aazadiDir)) {
      FS.mkdirSync(aazadiDir, { recursive: true })
    }
    await BUN.write(LAST_SYNC_PATH, JSON.stringify(lastSyncRecord, null, 2))

    console.log(
      `✅ Monthly sync complete! (${catalog.modelCount} models, curated: ${catalog.curatedAt})`
    )

    return {
      success: true,
      catalog,
      gitPushed,
      lastSyncUpdated: true,
    }
  } catch (error: any) {
    console.error("❌ Sync failed:", error.message)

    // Update last sync with failure
    try {
      const now = Date.now()
      const lastSyncRecord: LastSyncRecord = {
        timestamp: now,
        status: "failed",
      }
      const aazadiDir = PATH.dirname(LAST_SYNC_PATH)
      if (!FS.existsSync(aazadiDir)) {
        FS.mkdirSync(aazadiDir, { recursive: true })
      }
      await BUN.write(LAST_SYNC_PATH, JSON.stringify(lastSyncRecord, null, 2))
    } catch {
      // Ignore errors updating the sync record
    }

    return { success: false, error: error.message }
  }
}

/**
 * CLI entry point
 */
const args = process.argv.slice(2)
if (args.includes("--run") || args.includes("-r")) {
  refreshFreeModels()
    .then((result) => {
      if (!result.success && result.error) {
        process.exit(1)
      }
      process.exit(0)
    })
    .catch((err) => {
      console.error("Unexpected error:", err)
      process.exit(1)
    })
}