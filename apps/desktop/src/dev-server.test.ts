import { describe, expect, it } from "vitest"

import { createDevServer } from "./dev-server.js"

const ORIGIN = "http://localhost:3000"

/** A dev server whose answers come from `answers` in turn, on a fake clock. */
function fakeDevServer(answers: (number | "refused")[], timeoutMs = 10_000) {
  let now = 0
  const asked: string[] = []
  const server = createDevServer({
    origin: ORIGIN,
    timeoutMs,
    fetch: async (url) => {
      asked.push(String(url))
      const answer = answers.shift() ?? "refused"
      if (answer === "refused") throw new TypeError("fetch failed")
      return new Response(null, { status: answer })
    },
    clock: {
      now: () => now,
      wait: async (ms) => {
        now += ms
      },
    },
  })
  return { server, asked }
}

describe("Waiting for the next dev server", () => {
  it("is ready once Jarvis's page answers", async () => {
    const { server, asked } = fakeDevServer(["refused", "refused", 200])

    await server.waitUntilReady()

    expect(asked).toEqual([`${ORIGIN}/`, `${ORIGIN}/`, `${ORIGIN}/`])
  })

  it("keeps waiting while the page fails to build", async () => {
    const { server, asked } = fakeDevServer([500, 200])

    await server.waitUntilReady()

    expect(asked).toHaveLength(2)
  })

  it("gives up with the reason when nothing answers in time", async () => {
    const { server } = fakeDevServer([], 5_000)

    await expect(server.waitUntilReady()).rejects.toThrow(
      /localhost:3000.*pnpm dev/
    )
  })

  it("neither starts nor stops the server it doesn't own", async () => {
    const { server, asked } = fakeDevServer([200])

    await server.start()
    await server.stop()

    expect(asked).toEqual([])
  })
})
