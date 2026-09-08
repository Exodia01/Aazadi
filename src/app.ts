import { getLastSyncStatus } from "./plugin/status"
import { getProviderInfo } from "./data/providers"
import { checkAllBoosts } from "./data/fetch-models"
import * as BUN from "bun"
import * as PATH from "path"

const PORT = Number(process.env.AAZADI_PORT || 3939)
const CATALOG_PATH = PATH.join(
  import.meta.dirname,
  "../catalog/free-models-catalog.json"
)

/**
 * Aazadi dashboard server.
 * Serves a lightweight status page + JSON API backed by the synced catalog.
 */
const server = BUN.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    const status = await getLastSyncStatus()
    const models = (await BUN.file(CATALOG_PATH).exists())
      ? await BUN.file(CATALOG_PATH).json()
      : null

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const boosts = await checkAllBoosts()

      const rows = (models?.perModel ?? [])
        .map((m: any) => {
          const info = getProviderInfo(m.provider)
          const boost = boosts[m.provider] as any
          const boostBadge =
            info?.boostAvailable
              ? boost?.isBoosted
                ? '<span class="badge boost">boosted</span>'
                : '<span class="badge muted">boost-opt</span>'
              : ""
          const tosBadge =
            m.tos === "avoid"
              ? '<span class="badge warn">avoid</span>'
              : m.tos === "caution"
                ? '<span class="badge caution">caution</span>'
                : '<span class="badge ok">ok</span>'
          const tokens =
            m.monthlyTokens > 0
              ? `${(m.monthlyTokens / 1_000_000).toFixed(1)}M`
              : m.creditTokens > 0
                ? `${(m.creditTokens / 1_000_000).toFixed(0)}M credit`
                : "-"
          return `<tr>
              <td>${info?.name ?? m.provider}</td>
              <td><code>${m.modelId}</code></td>
              <td>${tokens}</td>
              <td>${m.freeType}</td>
              <td>${tosBadge}</td>
              <td>${boostBadge}</td>
            </tr>`
        })
        .join("")

      return new Response(
        `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Aazadi - Free Models Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #0f1115; color: #e6e6e6; }
    header { padding: 1.5rem 2rem; border-bottom: 1px solid #222; }
    h1 { margin: 0; font-size: 1.4rem; }
    small { color: #999; }
    main { padding: 2rem; max-width: 860px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #222; }
    th { color: #999; font-weight: 600; }
    code { background: #1a1d24; padding: .1rem .4rem; border-radius: 4px; }
    .card { background: #161a21; border: 1px solid #222; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .75rem; }
    .stat b { display: block; font-size: 1.25rem; }
    .stat span { color: #999; font-size: .8rem; }
    .badge { color: #fff; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; white-space: nowrap; }
    .badge.ok { background: #1e7e34; }
    .badge.caution { background: #b5892b; }
    .badge.warn { background: #b03030; }
    .badge.boost { background: #5b3fd4; }
    .badge.muted { background: #3a3f4b; color: #ddd; }
  </style>
</head>
<body>
  <header><h1>Aazadi <span style="color:#888">- free models dashboard</span></h1></header>
  <main>
    <div class="grid">
      <div class="card stat">
        <b>${models?.modelCount ?? 0}</b><span>free models tracked</span>
      </div>
      <div class="card stat">
        <b>${((models?.totals?.steadyRecurringTokens ?? 0) / 1_000_000).toFixed(0)}M</b><span>steady monthly tokens</span>
      </div>
      <div class="card stat">
        <b>${((models?.totals?.firstMonthRealisticTokens ?? 0) / 1_000_000).toFixed(0)}M</b><span>first month tokens</span>
      </div>
      <div class="card stat">
        <b>${status.status === "success" ? '<span class="badge">synced</span>' : status.status}</b><span>last sync: ${status.lastSync?.toISOString().slice(0, 10) ?? "never"}</span>
      </div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th>Provider</th><th>Model</th><th>Tokens</th><th>Free tier</th><th>TOS</th><th>Boost</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </main>
</body>
</html>`,
        { headers: { "content-type": "text/html; charset=utf-8" } }
      )
    }

    if (url.pathname === "/catalog.json") {
      return new Response(JSON.stringify(models, null, 2), {
        headers: { "content-type": "application/json" },
      })
    }

    if (url.pathname === "/api/status") {
      return new Response(JSON.stringify(await getLastSyncStatus(), null, 2), {
        headers: { "content-type": "application/json" },
      })
    }

    if (url.pathname === "/api/providers") {
      const { listProviders } = await import("./data/providers")
      return new Response(JSON.stringify(listProviders(), null, 2), {
        headers: { "content-type": "application/json" },
      })
    }

    return new Response("Not found", { status: 404 })
  },
})

console.log(`🕊️ Aazadi dashboard running at http://localhost:${PORT}`)