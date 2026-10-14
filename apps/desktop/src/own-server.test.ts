import { describe, expect, it } from "vitest"

import { createOwnServer, type ServerProcess } from "./own-server.js"

const ORIGIN = "http://127.0.0.1:3737"
const APP_DIR = "/opt/Jarvis/resources/server/apps/web"

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** A server process the test drives: it prints, exits, or gets killed. */
function fakeProcess() {
  const output: ((text: string) => void)[] = []
  const exit: ((code: number | null) => void)[] = []
  const process = {
    killed: false,
    print: (text: string) => output.forEach((listener) => listener(text)),
    exit: (code: number | null) => exit.forEach((listener) => listener(code)),
    handle: {
      onOutput: (listener) => void output.push(listener),
      onExit: (listener) => void exit.push(listener),
      kill() {
        process.killed = true
        // Next's server exits on SIGTERM.
        queueMicrotask(() => process.exit(null))
      },
    } satisfies ServerProcess,
  }
  return process
}

/** The own server over a fake process and a fake clock and network. */
function fakeOwnServer({
  answers = [],
  timeoutMs = 10_000,
}: { answers?: (number | "refused")[]; timeoutMs?: number } = {}) {
  let now = 0
  const child = fakeProcess()
  const forked: { modulePath: string; cwd: string; env: object }[] = []
  const logged: string[] = []
  const server = createOwnServer({
    appDir: APP_DIR,
    origin: ORIGIN,
    env: { PORT: "3737", HOSTNAME: "127.0.0.1" },
    timeoutMs,
    fork: (options) => {
      forked.push(options)
      return child.handle
    },
    log: (text) => logged.push(text),
    fetch: async () => {
      const answer = answers.shift() ?? "refused"
      if (answer === "refused") throw new TypeError("fetch failed")
      return new Response(null, { status: answer })
    },
    clock: {
      now: () => now,
      wait: async (ms) => {
        now += ms
        await settle()
      },
    },
  })
  return { server, child, forked, logged }
}

describe("The Jarvis App's own server", () => {
  it("runs Next's standalone server from its app folder", async () => {
    const { server, forked } = fakeOwnServer()

    await server.start()

    expect(forked).toEqual([
      {
        modulePath: `${APP_DIR}/server.js`,
        cwd: APP_DIR,
        env: { PORT: "3737", HOSTNAME: "127.0.0.1" },
      },
    ])
  })

  it("is ready once Jarvis's page answers", async () => {
    const { server } = fakeOwnServer({ answers: ["refused", 200] })

    await server.start()

    await expect(server.waitUntilReady()).resolves.toBeUndefined()
  })

  it("gives up when nothing answers in time", async () => {
    const { server } = fakeOwnServer({ timeoutMs: 3_000 })

    await server.start()

    await expect(server.waitUntilReady()).rejects.toThrow(/127\.0\.0\.1:3737/)
  })

  it("stops waiting as soon as the server exits, with its last words", async () => {
    const { server, child } = fakeOwnServer({ timeoutMs: 600_000 })
    await server.start()
    const ready = server.waitUntilReady()

    child.print("▲ Next.js 16\n")
    child.print(
      "Error: listen EADDRINUSE: address already in use 127.0.0.1:3737\n"
    )
    child.exit(1)

    await expect(ready).rejects.toThrow(
      /código 1.*EADDRINUSE: address already in use 127\.0\.0\.1:3737/
    )
  })

  it("writes everything the server prints to the log", async () => {
    const { server, child, logged } = fakeOwnServer()
    await server.start()

    child.print("▲ Next.js 16\n")
    child.print("✓ Ready in 80ms\n")

    expect(logged.join("")).toContain("▲ Next.js 16\n✓ Ready in 80ms\n")
  })

  it("reports exiting on its own after it was ready", async () => {
    const { server, child } = fakeOwnServer({ answers: [200] })
    const reasons: string[] = []
    server.onExit((reason) => reasons.push(reason))
    await server.start()
    await server.waitUntilReady()

    child.print("FATAL: out of memory\n")
    child.exit(134)

    expect(reasons).toEqual([expect.stringMatching(/134.*out of memory/)])
  })

  it("stops its process, without reporting it as an exit", async () => {
    const { server, child } = fakeOwnServer({ answers: [200] })
    const reasons: string[] = []
    server.onExit((reason) => reasons.push(reason))
    await server.start()
    await server.waitUntilReady()

    await server.stop()

    expect(child.killed).toBe(true)
    expect(reasons).toEqual([])
  })

  it("stops quietly when it was never started or already exited", async () => {
    const { server, child } = fakeOwnServer()
    await server.stop()

    await server.start()
    child.exit(1)
    await server.stop()

    expect(child.killed).toBe(false)
  })
})
