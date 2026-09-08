import * as PATH from "path"
import * as FS from "fs"
import * as BUN from "bun"

// OpenCode repo path - provided via OPENCODE_REPO_PATH env var.
// When unset, Aazadi falls back to the built-in KNOWN_FREE_MODELS catalog.
const FREE_CATALOG_SRC = "packages/core/src/free-model-catalog.ts"

export interface FreeModelBudget {
  provider: string
  modelId: string
  displayName: string
  monthlyTokens: number
  creditTokens: number
  freeType:
    | "recurring-daily"
    | "recurring-monthly"
    | "recurring-credit"
    | "recurring-uncapped"
    | "one-time-initial"
    | "keyless"
    | "discontinued"
  poolKey: string | null
  tos: "ok" | "caution" | "avoid" | "ambiguous" | "unknown"
}

export interface SyncedCatalog {
  curatedAt: string
  modelCount: number
  perModel: FreeModelBudget[]
  totals: {
    steadyRecurringTokens: number
    firstMonthRealisticTokens: number
  }
}

/**
 * Known free models - used as a reliable fallback when the OpenCode
 * source catalog cannot be parsed (e.g. non-UTF8/UTF16 encoded files).
 * Kept in sync with OpenCode's free-model-catalog.ts.
 */
export const KNOWN_FREE_MODELS: FreeModelBudget[] = [
  {
    provider: "github-models",
    modelId: "meta/llama-4-scout-17b-16e-instruct",
    displayName: "Llama 4 Scout (Free)",
    monthlyTokens: 18000000,
    creditTokens: 0,
    freeType: "recurring-daily",
    poolKey: "github-models",
    tos: "caution",
  },
  {
    provider: "api-airforce",
    modelId: "x-ai/grok-3",
    displayName: "Grok-3 (Free)",
    monthlyTokens: 24000000,
    creditTokens: 0,
    freeType: "recurring-daily",
    poolKey: "api-airforce",
    tos: "caution",
  },
  {
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B (Free)",
    monthlyTokens: 15000000,
    creditTokens: 0,
    freeType: "recurring-daily",
    poolKey: "groq",
    tos: "caution",
  },
  {
    provider: "bazaarlink",
    modelId: "auto:free",
    displayName: "Auto Free (Zero Cost)",
    monthlyTokens: 3600000,
    creditTokens: 0,
    freeType: "recurring-daily",
    poolKey: "bazaarlink",
    tos: "caution",
  },
  {
    provider: "agentrouter",
    modelId: "claude-opus-4-6",
    displayName: "Claude 4.6 Opus",
    monthlyTokens: 0,
    creditTokens: 200000000,
    freeType: "one-time-initial",
    poolKey: "agentrouter",
    tos: "caution",
  },
  // ─── Additional free platforms (community-curated) ───
  {
    provider: "openrouter",
    modelId: "openrouter:auto",
    displayName: "OpenRouter Auto (Free)",
    monthlyTokens: 1200000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "openrouter",
    tos: "ok",
  },
  {
    provider: "google",
    modelId: "google/gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash (Free)",
    monthlyTokens: 10000000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "google",
    tos: "ok",
  },
  {
    provider: "google",
    modelId: "google/gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash-Lite (Free)",
    monthlyTokens: 10000000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "google",
    tos: "ok",
  },
  {
    provider: "mistral",
    modelId: "mistral/mistral-small-latest",
    displayName: "Mistral Small (Free)",
    monthlyTokens: 5000000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "mistral",
    tos: "ok",
  },
  {
    provider: "together",
    modelId: "together/meta-llama-3.1-8b-instruct",
    displayName: "Llama 3.1 8B (Free)",
    monthlyTokens: 5000000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "together",
    tos: "caution",
  },
  {
    provider: "perplexity",
    modelId: "perplexity/sonar-free",
    displayName: "Perplexity Sonar (Free)",
    monthlyTokens: 400000,
    creditTokens: 0,
    freeType: "recurring-monthly",
    poolKey: "perplexity",
    tos: "caution",
  },
]

// Compute totals for a given list of free model budgets
export function computeTotals(budgets: FreeModelBudget[]): SyncedCatalog["totals"] {
  const recurringFreeTypes = new Set([
    "recurring-daily",
    "recurring-monthly",
    "keyless",
  ])

  const steadyRecurringTokens = budgets
    .filter((m) => recurringFreeTypes.has(m.freeType))
    .reduce((sum, m) => sum + m.monthlyTokens, 0)

  const oneTimeCredits = budgets
    .filter((m) => m.freeType === "one-time-initial")
    .reduce((sum, m) => sum + m.creditTokens, 0)

  const firstMonthRealisticTokens = steadyRecurringTokens + oneTimeCredits

  return {
    steadyRecurringTokens,
    firstMonthRealisticTokens,
  }
}

/**
 * Read a file, transparently decoding UTF-16LE/UTF-16BE sources
 * when a BOM is present (OpenCode's free-model-catalog.ts is UTF-16).
 */
async function readTextBomAware(filePath: string): Promise<string> {
  const buf = await BUN.file(filePath).arrayBuffer()
  const head = new Uint8Array(buf.slice(0, 2))

  if (head[0] === 0xff && head[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf)
  }
  if (head[0] === 0xfe && head[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buf)
  }
  return new TextDecoder("utf-8").decode(buf)
}

/**
 * Attempt to parse FREE_MODEL_BUDGETS out of the raw TypeScript source.
 * Returns null (not throw) when the source can't be parsed.
 */
function parseFreeModelBudgets(source: string): FreeModelBudget[] | null {
  const budgetsMatch = source.match(
    /export const FREE_MODEL_BUDGETS:\s*FreeModelBudget\[\s*\]\s*=\s*\[([\s\S]*?)\]\s*;?/
  )
  if (!budgetsMatch) return null

  const budgetsStr = budgetsMatch[1]!
  const budgets: FreeModelBudget[] = []

  // Extract each object literal from the array
  const objectMatches = budgetsStr.match(/\{[\s\S]*?\}/g) || []

  for (const objStr of objectMatches) {
    const get = (key: string): string | undefined => {
      const re = new RegExp(`${key}\\s*:\\s*("?)([^,}"]*)("?)`)
      const m = objStr.match(re)
      return m ? m[2] : undefined
    }

    const provider = get("provider")
    const modelId = get("modelId")
    if (!provider || !modelId) continue

    const findType = (key: string) => get(key) ?? "recurring-daily"

    budgets.push({
      provider,
      modelId,
      displayName: get("displayName") || modelId,
      monthlyTokens: Number(get("monthlyTokens")) || 0,
      creditTokens: Number(get("creditTokens")) || 0,
      freeType: findType("freeType") as FreeModelBudget["freeType"],
      poolKey: get("poolKey") ?? null,
      tos: (get("tos") || "unknown") as FreeModelBudget["tos"],
    })
  }

  return budgets.length > 0 ? budgets : null
}
export async function pullCatalog(): Promise<SyncedCatalog> {
  const opencodeRepoPath = process.env.OPENCODE_REPO_PATH

  let budgets: FreeModelBudget[] | null = null
  let sourceUsed = "known-models"

  if (opencodeRepoPath) {
    const catalogPath = PATH.join(opencodeRepoPath, FREE_CATALOG_SRC)
    try {
      if (await BUN.file(catalogPath).exists()) {
        console.log("Reading:", catalogPath)
        const catalogContent = await readTextBomAware(catalogPath)
        budgets = parseFreeModelBudgets(catalogContent)
        sourceUsed = "opencode-source"
      } else {
        console.warn(`⚠️ OpenCode catalog not found at ${catalogPath}, using known models`)
      }
    } catch (error: any) {
      console.warn(`⚠️ Could not read ${catalogPath}: ${error.message}`)
    }
  } else {
    console.warn("⚠️ OPENCODE_REPO_PATH not set, using built-in known free models")
  }

  if (!budgets || budgets.length === 0) {
    if (sourceUsed === "opencode-source") {
      console.warn("⚠️ Could not parse FREE_MODEL_BUDGETS from source, using known models")
    }
    budgets = KNOWN_FREE_MODELS
  } else {
    // Always merge community-curated platforms on top of whatever the
    // OpenCode source returned, so additional free providers are tracked.
    const seenPools = new Set(budgets.map((m) => m.poolKey))
    for (const extra of KNOWN_FREE_MODELS) {
      const key = extra.poolKey ?? extra.provider
      if (!seenPools.has(key)) {
        budgets.push(extra)
        seenPools.add(key)
      }
    }
  }

  // Deduplicate by poolKey, keeping highest monthly tokens
  const deduped = new Map<string, FreeModelBudget>()
  for (const m of budgets) {
    if (m.poolKey) {
      const existing = deduped.get(m.poolKey)
      if (!existing || m.monthlyTokens > existing.monthlyTokens) {
        deduped.set(m.poolKey, m)
      }
    }
  }

  return {
    curatedAt: new Date().toISOString().split("T")[0] ?? "",
    modelCount: budgets.length,
    perModel: [...budgets].sort((a, b) => b.monthlyTokens - a.monthlyTokens),
    totals: computeTotals(budgets),
  }
}

export async function writeCatalog(catalog: SyncedCatalog): Promise<void> {
  const targetPath = PATH.resolve(
    import.meta.dirname,
    "../../catalog/free-models-catalog.json"
  )

  const targetDir = PATH.dirname(targetPath)
  if (!FS.existsSync(targetDir)) {
    FS.mkdirSync(targetDir, { recursive: true })
  }

  await BUN.write(targetPath, JSON.stringify(catalog, null, 2))
  console.log(`✅ Catalog synced to ${targetPath}`)
}

export async function syncCatalog(): Promise<SyncedCatalog> {
  const catalog = await pullCatalog()
  await writeCatalog(catalog)
  return catalog
}