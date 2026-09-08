// Aazadi provider registry.
// Central metadata for every free-model platform Aazadi tracks.
// Token figures are community-curated estimates tuned from public free-tier
// documentation at curation time - adjust monthlyTokens to match what your
// provider dashboard reports.

export interface ProviderTier {
  free: { requestsPerDay: number; tokensPerMonth: number }
  boosted: { requestsPerDay: number; tokensPerMonth: number }
}

export interface ProviderInfo {
  id: string
  name: string
  homepage: string
  apiBase: string | null
  apiKeyEnv: string | null // env var holding the user's API key
  format: "openai" | "anthropic" | "google" | "oauth" | "keyless" | "unknown"
  boostAvailable: boolean
  boostFeePercent: number // pay-to-avail fee (OpenRouter uses 1%)
  tiers: ProviderTier | null
  freeTierNote: string
  tos: "ok" | "caution" | "ambiguous" | "unknown"
  source: "opencode-catalog" | "community-curated"
}

export const PROVIDER_REGISTRY: Record<string, ProviderInfo> = {
  "api-airforce": {
    id: "api-airforce",
    name: "API Airforce",
    homepage: "https://api.airforce",
    apiBase: null,
    apiKeyEnv: null,
    format: "keyless",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 60, tokensPerMonth: 24_000_000 }, boosted: { requestsPerDay: 60, tokensPerMonth: 24_000_000 } },
    freeTierNote: "Free Grok access routed through API Airforce.",
    tos: "caution",
    source: "opencode-catalog",
  },
  "github-models": {
    id: "github-models",
    name: "GitHub Models",
    homepage: "https://github.com/marketplace/models",
    apiBase: "https://models.github.ai/inference",
    apiKeyEnv: "GITHUB_TOKEN",
    format: "oauth",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 100, tokensPerMonth: 18_000_000 }, boosted: { requestsPerDay: 100, tokensPerMonth: 18_000_000 } },
    freeTierNote: "Free tier via GitHub Copilot subscription; rate-limited by model.",
    tos: "caution",
    source: "opencode-catalog",
  },
  groq: {
    id: "groq",
    name: "Groq",
    homepage: "https://console.groq.com",
    apiBase: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    format: "openai",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 200, tokensPerMonth: 15_000_000 }, boosted: { requestsPerDay: 200, tokensPerMonth: 15_000_000 } },
    freeTierNote: "Fast inference; free tier is rate-limited, not credit-based.",
    tos: "caution",
    source: "opencode-catalog",
  },
  bazaarlink: {
    id: "bazaarlink",
    name: "BazaarLink",
    homepage: "https://bazaarlink.xyz",
    apiBase: null,
    apiKeyEnv: null,
    format: "keyless",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 30, tokensPerMonth: 3_600_000 }, boosted: { requestsPerDay: 30, tokensPerMonth: 3_600_000 } },
    freeTierNote: "Zero-cost auto-routed free models.",
    tos: "caution",
    source: "opencode-catalog",
  },
  agentrouter: {
    id: "agentrouter",
    name: "AgentRouter",
    homepage: "https://agentrouter.ai",
    apiBase: null,
    apiKeyEnv: null,
    format: "keyless",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 500, tokensPerMonth: 200_000_000 }, boosted: { requestsPerDay: 500, tokensPerMonth: 200_000_000 } },
    freeTierNote: "One-time initial credit pool (200M tokens) for Claude 4.6 Opus.",
    tos: "caution",
    source: "opencode-catalog",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    homepage: "https://openrouter.ai",
    apiBase: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "openai",
    boostAvailable: true,
    boostFeePercent: 1, // pay-to-avail: 1% of availing cost
    tiers: { free: { requestsPerDay: 50, tokensPerMonth: 1_200_000 }, boosted: { requestsPerDay: 1000, tokensPerMonth: 24_000_000 } },
    freeTierNote: "Free tier: 50 req/day. Boost: one-time $10 lifetime top-up raises to 1000 req/day (~24M tokens/mo).",
    tos: "ok",
    source: "community-curated",
  },
  google: {
    id: "google",
    name: "Google AI Studio",
    homepage: "https://aistudio.google.com",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnv: "GEMINI_API_KEY",
    format: "google",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 100, tokensPerMonth: 10_000_000 }, boosted: { requestsPerDay: 100, tokensPerMonth: 10_000_000 } },
    freeTierNote: "Gemini Flash free tier: rate-limited RPM, generous daily token budget.",
    tos: "ok",
    source: "community-curated",
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    homepage: "https://console.mistral.ai",
    apiBase: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    format: "openai",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 100, tokensPerMonth: 5_000_000 }, boosted: { requestsPerDay: 100, tokensPerMonth: 5_000_000 } },
    freeTierNote: "La Plateforme free tier; small models have highest free quota.",
    tos: "ok",
    source: "community-curated",
  },
  together: {
    id: "together",
    name: "Together AI",
    homepage: "https://www.together.ai",
    apiBase: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    format: "openai",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 100, tokensPerMonth: 5_000_000 }, boosted: { requestsPerDay: 100, tokensPerMonth: 5_000_000 } },
    freeTierNote: "Free tier for lightweight open-source models.",
    tos: "caution",
    source: "community-curated",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    homepage: "https://www.perplexity.ai",
    apiBase: "https://api.perplexity.ai",
    apiKeyEnv: "PERPLEXITY_API_KEY",
    format: "openai",
    boostAvailable: false,
    boostFeePercent: 0,
    tiers: { free: { requestsPerDay: 5, tokensPerMonth: 400_000 }, boosted: { requestsPerDay: 5, tokensPerMonth: 400_000 } },
    freeTierNote: "sonar-free models on OpenRouter/Perplexity; small caps.",
    tos: "caution",
    source: "community-curated",
  },
}

export function getProviderInfo(id: string): ProviderInfo | null {
  return PROVIDER_REGISTRY[id] ?? null
}

export function listProviders(): ProviderInfo[] {
  return Object.values(PROVIDER_REGISTRY)
}