# Aazadi - Free Models Dashboard for OpenCode

**Aazadi** (Hindi/Urdu for "freedom") - A cross-platform free models dashboard for OpenCode that tracks token balances, rollover policies, daily reset countdown, and OpenRouter boost status with a pay-to-avail cost model.

## Aazadi & OpenCode

OpenCode ships a built-in catalog of free AI models (`free-model-catalog.ts`) with monthly token allowances from providers like GitHub Models, Groq, and OpenRouter. Aazadi is a companion tool that:

- **Listens** to that catalog on every OpenCode startup (via a plugin hook) and syncs the free model list on a monthly cadence.
- **Tracks** your remaining tokens, rollover policy, daily reset countdown, and OpenRouter boost tier.
- **Serves** a lightweight dashboard and JSON API so you always know what you can use for free.

In short: OpenCode gives you the 📦 free models — Aazadi gives you the 📊 freedom to use them without hitting limits blind.

---

## Mission

Empower OpenCode users with visibility into their free model usage, token balances, and optimization opportunities — while enabling contributors to earn revenue from each deployment.

---

## Open Collaboration Model

### Revenue Sharing

| Deployment Type | Revenue Share | Description |
|----------------|---------------|-------------|
| **Individual** | 100% | You keep all revenue from your personal deployments |
| **Team/Small Business** | 80/20 split | 80% to lead deployer, 20% to Aazadi core contributors |
| **Enterprise** | 70/30 split | 70% to organization, 30% to Aazadi core contributors |
| **Marketplace** | 70/30 split | 70% to Aazadi platform, 30% to individual contributor |

### Revenue Triggers

Revenue is generated per deployment through:

1. **Boost Tier Upgrades** - 1% of availing cost (when users upgrade from Free → Boosted tier)
2. **Premium Features** - Advanced analytics, custom thresholds, priority support
3. **Enterprise Licensing** - Organization-wide deployments with SLA
4. **Contributor Bonus** - Monthly bonus pool based on total deployments

### Revenue Distribution

```
Total Revenue
    ↓
├─ 60% → Aazadi Platform (maintenance, hosting, core development)
    ↓
├─ 30% → Core Contributors (proportional to PRs, issues, features)
    ↓
└─ 10% → Community Fund (hackathons, grants, open-source support)
```

---

## What's Included

Aazadi tracks every free model from the OpenCode catalog plus additional community-curated free platforms:

| Provider | Model | Free Tier | Monthly Tokens |
|----------|-------|-----------|----------------|
| api-airforce | x-ai/grok-3 | recurring-daily | 24M |
| github-models | meta/llama-4-scout-17b-16e-instruct | recurring-daily | 18M |
| groq | llama-3.3-70b-versatile | recurring-daily | 15M |
| google · Gemini Flash | google/gemini-2.0-flash | recurring-monthly | 10M |
| mistral | mistral/mistral-small-latest | recurring-monthly | 5M |
| together | together/meta-llama-3.1-8b-instruct | recurring-monthly | 5M |
| bazaarlink | auto:free | recurring-daily | 3.6M |
| openrouter | openrouter:auto | recurring-monthly | 1.2M (boost to 24M) |
| perplexity | perplexity/sonar-free | recurring-monthly | 0.4M |
| agentrouter | claude-opus-4-6 | one-time-initial | 200M credits |

**Totals:** 82.2M steady monthly tokens, 282.2M first-month realistic tokens.

> Provider metadata (API base, key env var, boost options, TOS) lives in **`src/data/providers.ts`**. Community-curated token figures are estimates — tune `monthlyTokens` in `src/sync/pull-catalog.ts` to match your provider dashboard.

---

## Quick Start

### Prerequisites

```bash
# Install Bun (cross-platform: Windows, Linux, macOS)
curl -fsSL https://bun.sh/install | bash

# macOS: brew install oven-sh/bun/bun
# Windows: curl -fsSL https://bun.sh/install | bash  (or npm i -g bun)
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Exodia01/Aazadi.git
cd Aazadi

# 2. Install dependencies
bun install

# 3. Sync the free models catalog
bun run sync

# 4. Start the dashboard
bun run dev
```

Point `OPENCODE_REPO_PATH` at your OpenCode installation to sync from the live source:

```bash
# Windows (PowerShell)
$env:OPENCODE_REPO_PATH = "C:\path\to\opencode"

# Linux / macOS
export OPENCODE_REPO_PATH="/path/to/opencode"
```

If the source catalog can't be parsed, Aazadi falls back to the built-in known models.

---

## Project Structure

```
Aazadi/
├── src/
│   ├── app.ts                  # Dashboard server (Bun)
│   ├── sync/                   # Monthly sync from OpenCode
│   │   ├── pull-catalog.ts     # Extract from free-model-catalog.ts (UTF-16 aware)
│   │   └── refresh-free-models.ts  # Orchestrate sync + git push
│   ├── data/
│   │   ├── providers.ts        # Provider registry (metadata, tiers, boost) ★
│   │   └── fetch-models.ts     # API fetchers (models, usage, per-provider boost)
│   └── plugin/
│       └── aazadi-plugin.ts    # OpenCode startup hook + last-sync tracking
│
├── catalog/                    # Synced catalog (auto-generated)
│   └── free-models-catalog.json
│
├── sync-monthly.ps1            # Windows sync script
├── sync-monthly.sh             # Linux/macOS sync script
├── package.json                # Bun dependencies
├── tsconfig.json               # TypeScript strict config
└── README.md                   # This file
```

---

## Monthly Sync Process

### How It Works

1. **Trigger**: Runs on OpenCode startup (plugin hook) or `bun run sync:monthly`
2. **Pull**: Extracts `FREE_MODEL_BUDGETS` from OpenCode's `packages/core/src/free-model-catalog.ts`
   - Handles UTF-16 encoded sources automatically
   - Falls back to built-in known models if parsing fails
3. **Write**: Outputs to `catalog/free-models-catalog.json`
4. **Commit**: Auto-commits with `chore: update free models catalog [auto]`
5. **Push**: Optional push to the git remote (`origin main`)

### Commands

```bash
bun run sync          # Sync catalog + commit + push
bun run dev           # Start dashboard server (default port 3939)
bun run typecheck     # TypeScript type check
bun run sync:push     # Git add + commit + push only
bun run sync:pull     # Pull latest from origin main
```

### Configuration

Aazadi stores local state in `~/.aazadi/`:

| File | Purpose |
|------|---------|
| `last-sync.json` | Timestamp + status of the last sync |
| `boost-settings.json` | Per-provider boost opt-in + spend tracking |

---

## Dashboard

The dashboard server exposes:

- `/` — HTML status page (per-provider table: tokens, free tier, TOS badge, boost status)
- `/catalog.json` — the synced catalog as JSON
- `/api/status` — last sync status as JSON
- `/api/providers` — the full provider registry as JSON

Port is configurable via `AAZADI_PORT` (default `3939`).

---

## Boost (Pay-to-Avail)

Aazadi implements per-provider pay-to-avail boost tracking:

- **OpenRouter** (boost available): Free = 50 req/day, 1.2M tokens/mo; Boosted = 1,000 req/day, 24M tokens/mo. Cost = **1% of the month's spend** (opt-in pay-to-avail).
- **Other providers**: metadata-driven via `src/data/providers.ts` (`boostAvailable`, `boostFeePercent`, `tiers`). Boosted status is stored per-provider in `~/.aazadi/boost-settings.json` with zero telemetry.

---

## Data Privacy

### Local-First Approach

- **Catalog**: `catalog/free-models-catalog.json` (in the repo)
- **Usage tracking**: `~/.aazadi/`
- **No external telemetry** by default

### Opt-In Remote Sync

Catalog sync to git is optional:

```bash
# Push synced catalog to GitHub
bun run sync:push

# Pull from other devices
bun run sync:pull
```

---

## Cross-Platform Support

| OS | Bun Support | Status |
|-----|-------------|--------|
| **Windows** | Bun 1.0+ | Full support |
| **Linux** | Bun 1.0+ | Full support |
| **macOS** | Bun 1.0+ | Full support |

The runtime is Bun (cross-platform). Sync scripts are provided for both PowerShell (`sync-monthly.ps1`) and Bash (`sync-monthly.sh`).

---

## Contributing

### Getting Started

1. **Fork the repo** on GitHub
2. **Clone your fork** and create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes** following the code style
4. **Test locally**:
   ```bash
   bun run sync
   bun run typecheck
   ```
5. **Commit and push**, then open a Pull Request to `main`

### Contribution Types & Shares

| Contribution Type | Revenue Share | Example |
|------------------|---------------|---------|
| **Bug Fix** | +$0.50/month | Critical issue resolution |
| **Feature Addition** | +$2.00/month | New provider, UI component |
| **Documentation** | +$0.25/month | README, tutorials, guides |
| **Bug Fix (Critical)** | +$5.00/month | Security, data loss prevention |
| **Performance Optim** | +$1.00/month | Speed, resource usage |
| **Monthly Bonus Pool** | Variable | Based on total deployments |

### Revenue Sharing Formula

```
Contributor Share = (PR Points / Total PR Points) × Monthly Revenue

PR Points System:
- Bug fix: 1 point
- Feature: 3 points
- Documentation: 1 point
- Performance: 2 points
- Critical: 5 points
- Monthly base: 10 points (distributed)
```

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **Bun**: Native TypeScript support, fast runtime
- **Commit messages**: Conventional commits format
  - `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE).

---

## Contact & Support

- **GitHub**: https://github.com/Exodia01/Aazadi
- **Issues**: https://github.com/Exodia01/Aazadi/issues

---

*Aazadi - Freedom to use AI models without boundaries.*