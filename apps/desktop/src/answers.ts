/** How often to ask whether Jarvis's server answers yet. */
const POLL_MS = 500

export type Clock = {
  now: () => number
  wait: (ms: number) => Promise<void>
}

export const realClock: Clock = {
  now: Date.now,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

/**
 * Resolves once Jarvis's page at `origin` answers without a server error.
 * Rejects with `gaveUp()` once `timeoutMs` passes, or at once with whatever
 * `failed()` returns, e.g. when the server's process has died meanwhile.
 */
export async function waitForAnswer({
  origin,
  timeoutMs,
  fetch,
  clock,
  gaveUp,
  failed = () => undefined,
}: {
  origin: string
  timeoutMs: number
  fetch: (url: string) => Promise<Response>
  clock: Clock
  gaveUp: () => Error
  failed?: () => Error | undefined
}) {
  const giveUpAt = clock.now() + timeoutMs
  while (clock.now() < giveUpAt) {
    const failure = failed()
    if (failure) throw failure
    try {
      const response = await fetch(`${origin}/`)
      if (response.status < 500) return
    } catch {
      // Not listening yet.
    }
    await clock.wait(POLL_MS)
  }
  throw failed() ?? gaveUp()
}
