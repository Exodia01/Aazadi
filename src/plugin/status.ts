import * as PATH from "path"
import * as BUN from "bun"

const USER_HOME = process.env.HOME || process.env.USERPROFILE || "/tmp"
const AAZADI_DIR = PATH.join(USER_HOME, ".aazadi")
export const LAST_SYNC_PATH = PATH.join(AAZADI_DIR, "last-sync.json")
export const SYNCED_CATALOG_PATH = PATH.join(
  import.meta.dirname,
  "../../catalog/free-models-catalog.json"
)

export interface LastSyncRecord {
  timestamp: number
  catalogVersion?: string
  status: "success" | "failed" | "never"
}

export const defaultLastSync: LastSyncRecord = {
  timestamp: 0,
  status: "never",
}

/**
 * Read the last sync record from ~/.aazadi/last-sync.json
 */
export async function readLastSync(): Promise<LastSyncRecord> {
  if (await BUN.file(LAST_SYNC_PATH).exists()) {
    try {
      return JSON.parse(await BUN.file(LAST_SYNC_PATH).text()) as LastSyncRecord
    } catch {
      return defaultLastSync
    }
  }
  return defaultLastSync
}

/**
 * Get last sync status (read-only; never touches git or the network)
 */
export async function getLastSyncStatus(): Promise<{
  lastSync: Date | null
  daysAgo: number | null
  status: "success" | "failed" | "never"
  modelCount: number | null
}> {
  const record = await readLastSync()
  const NOW = Date.now()
  const diffMs = NOW - record.timestamp
  const daysAgo = diffMs > 0 ? Math.floor(diffMs / (24 * 60 * 60 * 1000)) : null

  let modelCount: number | null = null
  if (record.catalogVersion !== undefined && (await BUN.file(SYNCED_CATALOG_PATH).exists())) {
    try {
      modelCount = (await BUN.file(SYNCED_CATALOG_PATH).json()).modelCount ?? null
    } catch {
      modelCount = null
    }
  }

  return {
    lastSync: record.timestamp > 0 ? new Date(record.timestamp) : null,
    daysAgo,
    status: record.status,
    modelCount,
  }
}