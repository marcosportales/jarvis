import { describe, expect, it } from "vitest"

import { openDatabase } from "../db"
import { createSessionStore } from "../sessions/store"
import { createMemoryStore } from "./store"
import { CORE_BUDGET_TOKENS, createMemoryTools, memoryNotice } from "./tools"

const NOW = new Date("2026-10-14T10:00:00Z")

const MINUTE = 60_000

function setup() {
  const db = openDatabase(":memory:")
  const clock = { now: NOW }
  const now = () => clock.now
  const memories = createMemoryStore(db, { now })
  const sessions = createSessionStore(db, { now })
  /** Moves the clock forward, so the next write is the most recent one. */
  const later = (minutes = 1) => {
    clock.now = new Date(clock.now.getTime() + minutes * MINUTE)
  }
  return { memories, sessions, later }
}

async function call(
  turn: ReturnType<typeof createMemoryTools>,
  name: string,
  input: unknown
) {
  const execute = turn.tools[name]?.execute
  if (!execute) throw new Error(`no tool ${name}`)
  return execute(input, { toolCallId: "call-1", messages: [], context: {} })
}

const sister = {
  topicKey: "hermana",
  title: "Su hermana",
  content: "La hermana del dueño se llama Lucía.",
}

describe("Jarvis's Memory tools for a Turn", () => {
  it("remembers a new Memory and records a remembered event", async () => {
    const { memories } = setup()
    const turn = createMemoryTools(memories)

    const result = await call(turn, "remember", sister)

    expect(await memories.all()).toMatchObject([sister])
    expect(turn.events()).toEqual([
      { kind: "remembered", title: "Su hermana" },
    ])
    expect(result).toMatch(/Su hermana/)
  })

  it("replaces the Memory with the same topic key instead of adding another", async () => {
    const { memories, later } = setup()
    await call(createMemoryTools(memories), "remember", {
      topicKey: "trabajo",
      title: "Su trabajo",
      content: "El dueño trabaja en Acme.",
    })
    later()

    const turn = createMemoryTools(memories)
    await call(turn, "remember", {
      topicKey: "trabajo",
      title: "Su trabajo",
      content: "El dueño trabaja en Globex.",
    })

    const kept = await memories.all()
    expect(kept).toHaveLength(1)
    expect(kept[0]).toMatchObject({
      topicKey: "trabajo",
      content: "El dueño trabaja en Globex.",
      createdAt: NOW,
      updatedAt: new Date(NOW.getTime() + MINUTE),
    })
    expect(turn.events()).toEqual([{ kind: "remembered", title: "Su trabajo" }])
  })

  it("keeps each Turn's events separate", async () => {
    const { memories } = setup()
    await call(createMemoryTools(memories), "remember", sister)

    expect(createMemoryTools(memories).events()).toEqual([])
  })

  it("keeps the Memory when the Session it was learned in is deleted", async () => {
    const { memories, sessions } = setup()
    const sessionId = await sessions.start({ owner: "Hola", reply: "Hola" })
    const turn = createMemoryTools(memories, { sessionId })
    await call(turn, "remember", sister)

    await sessions.delete(sessionId)

    expect(await memories.all()).toMatchObject([
      { ...sister, sourceSessionId: null },
    ])
  })

  it("links Memories from a new Session to it once the Turn is saved", async () => {
    const { memories, sessions } = setup()
    const turn = createMemoryTools(memories)
    await call(turn, "remember", sister)

    const sessionId = await sessions.start({ owner: "Hola", reply: "Hola" })
    await turn.adoptSession(sessionId)

    expect(await memories.all()).toMatchObject([{ sourceSessionId: sessionId }])
  })

  it("answers a failed save with a model-facing error and records nothing", async () => {
    const { memories } = setup()
    // The Session vanished mid-Turn, so the Memory can't point at it.
    const turn = createMemoryTools(memories, { sessionId: "deleted" })

    const result = await call(turn, "remember", sister)

    expect(turn.events()).toEqual([])
    expect(result).toMatch(/No pude/)
  })
})

describe("forget", () => {
  it("removes the Memory and records a forgotten event", async () => {
    const { memories } = setup()
    await call(createMemoryTools(memories), "remember", sister)
    const turn = createMemoryTools(memories)

    const result = await call(turn, "forget", { topicKey: "hermana" })

    expect(await memories.all()).toEqual([])
    expect(turn.events()).toEqual([{ kind: "forgotten", title: "Su hermana" }])
    expect(result).toMatch(/Su hermana/)
  })

  it("answers an unknown topic key with a model-facing no-match and records nothing", async () => {
    const { memories } = setup()
    await call(createMemoryTools(memories), "remember", sister)
    const turn = createMemoryTools(memories)

    const result = await call(turn, "forget", { topicKey: "trabajo" })

    expect(await memories.all()).toHaveLength(1)
    expect(turn.events()).toEqual([])
    expect(result).toMatch(/no hay ninguna memoria/i)
  })

  it("records both events when a Memory is remembered and then forgotten in one Turn", async () => {
    const { memories } = setup()
    const turn = createMemoryTools(memories)

    await call(turn, "remember", sister)
    await call(turn, "forget", { topicKey: "hermana" })

    expect(turn.events()).toEqual([
      { kind: "remembered", title: "Su hermana" },
      { kind: "forgotten", title: "Su hermana" },
    ])
  })
})

describe("Core Memories notice", () => {
  it("says when Jarvis has no Memories yet", async () => {
    const { memories } = setup()

    expect(await memoryNotice(memories)).toMatch(/no tienes ninguna memoria/i)
  })

  it("lists Memories with their topic keys, newest-updated first", async () => {
    const { memories, later } = setup()
    const turn = createMemoryTools(memories)
    await call(turn, "remember", sister)
    later()
    await call(turn, "remember", {
      topicKey: "trato",
      title: "Cómo tratarle",
      content: "El dueño prefiere que le hablen de tú.",
    })
    later()
    // Updating an old Memory makes it the newest.
    await call(turn, "remember", {
      ...sister,
      content: "La hermana del dueño se llama Lucía y vive en Sevilla.",
    })

    const notice = await memoryNotice(memories)

    expect(notice).toContain(
      "[hermana] Su hermana: La hermana del dueño se llama Lucía y vive en Sevilla."
    )
    expect(notice).toContain(
      "[trato] Cómo tratarle: El dueño prefiere que le hablen de tú."
    )
    expect(notice.indexOf("[hermana]")).toBeLessThan(notice.indexOf("[trato]"))
  })

  it("cuts the oldest Memories at the token budget", async () => {
    const { memories, later } = setup()
    const turn = createMemoryTools(memories)
    // About 100 tokens each, so 30 of them are twice the budget.
    for (let n = 1; n <= 30; n++) {
      await call(turn, "remember", {
        topicKey: `tema-${n}`,
        title: `Tema ${n}`,
        content: `Dato ${n}: ${"bla ".repeat(100)}`,
      })
      later()
    }

    const notice = await memoryNotice(memories)

    expect(notice).toContain("[tema-30]")
    expect(notice).not.toContain("[tema-1]")
    // Estimated at four characters a token.
    expect(notice.length / 4).toBeLessThanOrEqual(CORE_BUDGET_TOKENS + 100)
    expect(notice.length / 4).toBeGreaterThan(CORE_BUDGET_TOKENS - 200)
  })
})
