import path from "node:path"

import { realClock, waitForAnswer, type Clock } from "./answers.js"
import type { Server } from "./ports.js"

/** The running server process, as the Jarvis App sees it. */
export type ServerProcess = {
  /** Everything it prints, on stdout and stderr alike. */
  onOutput(listener: (text: string) => void): void
  /** Its exit code, or null when a signal ended it. */
  onExit(listener: (code: number | null) => void): void
  kill(): void
}

/** Starts a Node module in a background process of the Jarvis App. */
export type Fork = (options: {
  modulePath: string
  cwd: string
  env: Record<string, string>
}) => ServerProcess

/** Where the server's output goes: the log file in the config directory. */
export type ServerLog = {
  write(text: string): void
  /** Ends the log; resolves once everything written is in the file. */
  end(): Promise<void>
}

/** How long a stopping server gets before the Jarvis App quits anyway. */
const STOP_GRACE_MS = 5_000

/** How long the log gets to be written out before the Jarvis App quits. */
const LOG_FLUSH_GRACE_MS = 2_000

/**
 * The Server port in the packaged Jarvis App: Next's standalone server of
 * the web app, run from its own app folder (where it finds its migrations),
 * with its output written to the log.
 */
export function createOwnServer({
  appDir,
  origin,
  env,
  timeoutMs,
  fork,
  log,
  fetch = globalThis.fetch,
  clock = realClock,
}: {
  /** The standalone web app's folder, the one holding `server.js`. */
  appDir: string
  origin: string
  env: Record<string, string>
  timeoutMs: number
  fork: Fork
  log: ServerLog
  fetch?: (url: string) => Promise<Response>
  clock?: Clock
}): Server {
  const exitListeners: ((reason: string) => void)[] = []
  let child: ServerProcess | undefined
  /** Settles when the started process exits; undefined once it has. */
  let running: Promise<void> | undefined
  let exitReason: string | undefined
  let ready = false
  let stopping = false
  let lastLine = ""

  return {
    async start() {
      const started = fork({
        modulePath: path.join(appDir, "server.js"),
        cwd: appDir,
        env,
      })
      child = started
      started.onOutput((text) => {
        log.write(text)
        const lines = text.split("\n").filter((line) => line.trim())
        if (lines.length) lastLine = lines.at(-1)!.trim()
      })
      running = new Promise((resolve) => {
        started.onExit((code) => {
          running = undefined
          exitReason = `el proceso terminó${code === null ? "" : ` con código ${code}`}${lastLine ? `: ${lastLine}` : ""}`
          resolve()
          if (ready && !stopping) {
            for (const listener of exitListeners) listener(exitReason)
          }
        })
      })
    },

    async waitUntilReady() {
      await waitForAnswer({
        origin,
        timeoutMs,
        fetch,
        clock,
        gaveUp: () =>
          new Error(`Nada responde en ${origin} tras ${timeoutMs / 1000} s.`),
        failed: () => (exitReason ? new Error(exitReason) : undefined),
      })
      ready = true
    },

    async stop() {
      stopping = true
      if (child && running) {
        const exited = running
        child.kill()
        await Promise.race([exited, clock.wait(STOP_GRACE_MS)])
      }
      // The Jarvis App exits right after, which would drop the log's last
      // lines, those an error dialog points the Owner to, still unwritten.
      await Promise.race([log.end(), clock.wait(LOG_FLUSH_GRACE_MS)])
    },

    onExit(listener) {
      exitListeners.push(listener)
    },
  }
}
