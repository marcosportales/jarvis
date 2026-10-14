import { realClock, waitForAnswer } from "./answers.js"
import type { Server } from "./ports.js"

/**
 * The Server port in dev mode: Jarvis's server is the `next dev` one, started
 * beside the Jarvis App, so the Jarvis App only waits for it to answer.
 * The first answer can take a while, since `next dev` builds the page then.
 */
export function createDevServer({
  origin,
  timeoutMs,
  fetch = globalThis.fetch,
  now = realClock.now,
  wait = realClock.wait,
}: {
  origin: string
  timeoutMs: number
  fetch?: (url: string) => Promise<Response>
  now?: () => number
  wait?: (ms: number) => Promise<void>
}): Server {
  return {
    async start() {},
    waitUntilReady: () =>
      waitForAnswer({
        origin,
        timeoutMs,
        fetch,
        clock: { now, wait },
        gaveUp: () =>
          new Error(
            `Nada responde en ${origin} tras ${timeoutMs / 1000} s. ¿Está corriendo \`pnpm dev\`?`
          ),
      }),
    async stop() {},
    onExit() {},
  }
}
