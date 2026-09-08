import * as PATH from "path"
import * as BUN from "bun"
import { getProviderInfo, listProviders, type ProviderInfo } from "./providers"

// OpenCode API endpoints (internal)
const OPENCODE_INTERNAL_API =
  process.env.OPENCODE_API_URL ?? "http://localhost:3000"

// Re-export the extended provider registry shape for convenience
export type { ProviderInfo }
export { getProviderInfo, listProviders } from "./providers"

// Path to aazadi config dir (~/.aazadi)
function aazadiConfigPath(fileName: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || ""
  return PATH.join(home, ".aazadi", fileName)
}

export async function fetchModelsFromOpenCode(): Promise<ProviderInfo[]> {
  try {
    // Return the full provider registry (synced catalog is the source of truth
    // for per-model budgets; this provides rich provider metadata).
    return listProviders()
  } catch (error) {
    console.warn("⚠️ Could not fetch models from OpenCode API, using synced catalog")
    return []
  }
}

// Fetch current token usage from workspace
export async function fetchTokenUsage(workspaceId?: string): Promise<{
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  timestamp: Date
}[]> {
  try {
    // Try to fetch from OpenCode's billing/usage API
    // The usage-section.tsx fetches from Billing.usages(page, PAGE_SIZE)
    // For now, return empty and rely on synced data + user tracking

    return []
  } catch (error) {
    console.warn("⚠️ Could not fetch token usage, using local tracking")
    return []
  }
}

// Check boost status for a specific provider (pay-to-avail model)
export async function checkProviderBoost(
  providerId: string
): Promise<{
  isBoosted: boolean
  currentTier: "free" | "boosted"
  requestsPerDay: number
  tokensPerMonth: number
  boostFee: number
  totalSpent: number
  boostAvailable: boolean
  boostFeePercent: number
}> {
  try {
    const info = getProviderInfo(providerId)
    const boostSettingsPath = aazadiConfigPath("boost-settings.json")

    let settings: Record<string, any> = {}
    if (await BUN.file(boostSettingsPath).exists()) {
      settings = JSON.parse(await BUN.file(boostSettingsPath).text())
    }

    // Per-provider persisted boost/spend state
    const providerState = settings[providerId] || { isBoosted: false, totalSpentThisMonth: 0 }
    const isBoosted = providerState.isBoosted || false
    const totalSpent = providerState.totalSpentThisMonth || 0

    // Defaults when provider metadata is unknown
    const boostAvailable = info?.boostAvailable ?? false
    const boostFeePercent = info?.boostFeePercent ?? 0
    const defaultTiers = {
      free: { requestsPerDay: 50, tokensPerMonth: 1_200_000 },
      boosted: { requestsPerDay: 1000, tokensPerMonth: 24_000_000 },
    }
    const tiers = info?.tiers ?? defaultTiers
    const tier = isBoosted ? tiers.boosted : tiers.free

    // Pay-to-avail fee: percent of the month's spend on that provider
    const boostFee = isBoosted ? Math.round(totalSpent * (boostFeePercent / 100)) : 0

    return {
      isBoosted,
      currentTier: isBoosted ? "boosted" : "free",
      requestsPerDay: tier.requestsPerDay,
      tokensPerMonth: tier.tokensPerMonth,
      boostFee,
      totalSpent,
      boostAvailable,
      boostFeePercent,
    }
  } catch (error) {
    console.warn(`⚠️ Could not check boost status for ${providerId}, using defaults`)
    return {
      isBoosted: false,
      currentTier: "free",
      requestsPerDay: 50,
      tokensPerMonth: 1_200_000,
      boostFee: 0,
      totalSpent: 0,
      boostAvailable: false,
      boostFeePercent: 0,
    }
  }
}

// Check OpenRouter boost status (kept for backwards compat, routes to the general one)
export function checkOpenRouterBoost(
  providerId: string
): Promise<{
  isBoosted: boolean
  currentTier: "free" | "boosted"
  requestsPerDay: number
  tokensPerMonth: number
  boostFee: number
  totalSpent: number
}> {
  return checkProviderBoost(providerId)
}

// Save boost settings per-provider
export async function saveBoostSettings(
  providerId: string,
  isBoosted: boolean,
  totalSpent: number
): Promise<void> {
  const boostSettingsPath = aazadiConfigPath("boost-settings.json")

  // Ensure .aazadi directory exists
  const aazadiDir = PATH.dirname(boostSettingsPath)
  if (!(await BUN.file(aazadiDir).exists())) {
    const { mkdirSync } = await import("fs")
    mkdirSync(aazadiDir, { recursive: true })
  }

  let settings: Record<string, any> = {}
  if (await BUN.file(boostSettingsPath).exists()) {
    settings = JSON.parse(await BUN.file(boostSettingsPath).text())
  }

  settings[providerId] = {
    isBoosted,
    totalSpentThisMonth: totalSpent,
    lastUpdated: new Date().toISOString(),
  }

  await BUN.write(boostSettingsPath, JSON.stringify(settings, null, 2))
  console.log(`💾 Boost settings saved for ${providerId}`)
}

// Get all boost statuses for every tracked provider
export async function checkAllBoosts(): Promise<
  Record<string, Awaited<ReturnType<typeof checkProviderBoost>>>
> {
  const result: Record<string, Awaited<ReturnType<typeof checkProviderBoost>>> = {}
  for (const p of listProviders()) {
    result[p.id] = await checkProviderBoost(p.id)
  }
  return result
}