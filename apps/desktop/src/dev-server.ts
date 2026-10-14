import type { Server } from "./ports.js"

/** How often to ask whether the dev server answers yet. */
const POLL_MS = 500

/**
 * The Server port in dev mode: Jarvis's server is the `next dev` one, started
 * beside the Jarvis App, so the Jarvis App only waits for it to answer.
 * The first answer can take a while, since `next dev` builds the page then.
 */
export function createDevServer({
  origin,
  timeoutMs,
  fetch = globalThis.fetch,
  now = Date.now,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: {
  origin: string
  timeoutMs: number
  fetch?: (url: string) => Promise<Response>
  now?: () => number
  wait?: (ms: number) => Promise<void>
}): Server {
  return {
    async start() {},
    async waitUntilReady() {
      const giveUpAt = now() + timeoutMs
      while (now() < giveUpAt) {
        try {
          const response = await fetch(`${origin}/`)
          if (response.status < 500) return
        } catch {
          // Not listening yet.
        }
        await wait(POLL_MS)
      }
      throw new Error(
        `Nada responde en ${origin} tras ${timeoutMs / 1000} s. ¿Está corriendo \`pnpm dev\`?`
      )
    },
    async stop() {},
    onExit() {},
  }
}
