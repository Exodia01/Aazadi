import type { Hooks, PluginModule } from "@opencode-ai/plugin"
import { getLastSyncStatus } from "./status"

/**
 * Aazadi OpenCode plugin.
 *
 * Read-only by design: it never touches git, never writes files, and never
 * does network I/O. On load it reports the last catalog sync status so users
 * can see whether `bun run sync` is due. All heavy work (sync, git push)
 * lives in the CLI path (src/sync/refresh-free-models.ts) and is triggered
 * manually - never from inside the OpenCode runtime.
 *
 * The module exports exactly one value (the plugin), so OpenCode's plugin
 * loader sees a single plugin function and nothing else.
 */
const AazadiPlugin: PluginModule = {
  id: "aazadi",
  server: async (): Promise<Hooks> => {
    try {
      const status = await getLastSyncStatus()
      const when = status.lastSync ? status.lastSync.toISOString().slice(0, 10) : "never"
      const models = status.modelCount !== null ? `, ${status.modelCount} models` : ""
      console.log(`🕊️ Aazadi: last sync ${when} (${status.status})${models}`)
      console.log("   Run `bun run sync` to refresh the free models catalog.")
    } catch (error: any) {
      console.warn(`🕊️ Aazadi: could not read sync status: ${error?.message ?? error}`)
    }
    return {}
  },
}

export default AazadiPlugin