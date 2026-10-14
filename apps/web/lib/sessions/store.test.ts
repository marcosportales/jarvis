import { describe, expect, it } from "vitest"

import { openDatabase } from "../db"
import { createSessionStore, UnknownSessionError } from "./store"

const NOW = new Date("2026-10-14T10:00:00Z")

const MINUTE = 60_000

function setup() {
  const clock = { now: NOW }
  const store = createSessionStore(openDatabase(":memory:"), {
    now: () => clock.now,
  })
  /** Moves the clock forward, so the next write is the most recent one. */
  const later = (minutes = 1) => {
    clock.now = new Date(clock.now.getTime() + minutes * MINUTE)
  }
  return { store, clock, later }
}

const turn = (n: number) => ({
  owner: `Pregunta ${n}`,
  reply: `Respuesta ${n}`,
})

describe("Sessions store", () => {
  it("starts a Session with its first Turn", async () => {
    const { store } = setup()

    const id = await store.start(turn(1))

    expect(await store.transcript(id)).toEqual([turn(1)])
  })

  it("gives every Session its own URL-safe id", async () => {
    const { store } = setup()

    const first = await store.start(turn(1))
    const second = await store.start(turn(1))

    expect(first).not.toBe(second)
    expect(encodeURIComponent(first)).toBe(first)
  })

  it("keeps the full Transcript in the order the Turns happened", async () => {
    const { store, later } = setup()
    const id = await store.start(turn(1))
    for (const n of [2, 3, 4]) {
      later()
      await store.addTurn(id, turn(n))
    }

    expect(await store.transcript(id)).toEqual([
      turn(1),
      turn(2),
      turn(3),
      turn(4),
    ])
  })

  it("keeps each Session's Turns apart", async () => {
    const { store } = setup()
    const trip = await store.start(turn(1))
    const work = await store.start(turn(10))
    await store.addTurn(trip, turn(2))

    expect(await store.transcript(trip)).toEqual([turn(1), turn(2)])
    expect(await store.transcript(work)).toEqual([turn(10)])
  })

  it("gives Jarvis only the last 20 Turns, oldest first", async () => {
    const { store } = setup()
    const id = await store.start(turn(1))
    for (let n = 2; n <= 25; n++) await store.addTurn(id, turn(n))

    const recent = await store.recentTurns(id)

    expect(recent).toHaveLength(20)
    expect(recent?.[0]).toEqual(turn(6))
    expect(recent?.at(-1)).toEqual(turn(25))
  })

  it("gives Jarvis every Turn while there are fewer than 20", async () => {
    const { store } = setup()
    const id = await store.start(turn(1))
    await store.addTurn(id, turn(2))

    expect(await store.recentTurns(id)).toEqual([turn(1), turn(2)])
  })

  it("knows nothing about an unknown Session", async () => {
    const { store } = setup()

    expect(await store.transcript("nope")).toBeNull()
    expect(await store.recentTurns("nope")).toBeNull()
    await expect(store.addTurn("nope", turn(1))).rejects.toBeInstanceOf(
      UnknownSessionError
    )
  })
})
