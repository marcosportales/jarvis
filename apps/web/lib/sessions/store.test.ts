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

  it("lists Sessions by last activity, newest first", async () => {
    const { store, later } = setup()
    const trip = await store.start(turn(1))
    later()
    const work = await store.start(turn(1))
    later()
    const recipes = await store.start(turn(1))
    later()
    await store.addTurn(trip, turn(2))

    const page = await store.list()

    expect(page.sessions.map(({ id }) => id)).toEqual([trip, recipes, work])
    expect(page.sessions[0]).toEqual({
      id: trip,
      title: null,
      createdAt: NOW,
      lastActivityAt: new Date(NOW.getTime() + 3 * MINUTE),
    })
    expect(page.nextCursor).toBeNull()
  })

  it("pages the list 20 at a time with a cursor", async () => {
    const { store, later } = setup()
    const ids: string[] = []
    for (let n = 0; n < 45; n++) {
      ids.unshift(await store.start(turn(n)))
      later()
    }

    const first = await store.list()
    const second = await store.list(first.nextCursor!)
    const third = await store.list(second.nextCursor!)

    expect(first.sessions.map(({ id }) => id)).toEqual(ids.slice(0, 20))
    expect(second.sessions.map(({ id }) => id)).toEqual(ids.slice(20, 40))
    expect(third.sessions.map(({ id }) => id)).toEqual(ids.slice(40))
    expect(third.nextCursor).toBeNull()
  })

  it("pages Sessions with the same last activity without skipping or repeating any", async () => {
    const { store } = setup()
    const ids = new Set<string>()
    for (let n = 0; n < 25; n++) ids.add(await store.start(turn(n)))

    const first = await store.list()
    const second = await store.list(first.nextCursor!)
    const listed = [...first.sessions, ...second.sessions].map(({ id }) => id)

    expect(listed).toHaveLength(25)
    expect(new Set(listed)).toEqual(ids)
    expect(second.nextCursor).toBeNull()
  })

  it("ends cleanly when the last page is exactly full", async () => {
    const { store, later } = setup()
    for (let n = 0; n < 20; n++) {
      await store.start(turn(n))
      later()
    }

    const page = await store.list()

    expect(page.sessions).toHaveLength(20)
    expect(page.nextCursor).toBeNull()
  })

  it("lists nothing when there are no Sessions", async () => {
    const { store } = setup()

    expect(await store.list()).toEqual({ sessions: [], nextCursor: null })
  })

  it("shows a Session's Session Title in the list once set", async () => {
    const { store } = setup()
    const id = await store.start(turn(1))

    await store.setTitle(id, "Viaje a Lisboa")

    const [listed] = (await store.list()).sessions
    expect(listed).toMatchObject({ id, title: "Viaje a Lisboa" })
  })

  it("setting a title doesn't count as activity", async () => {
    const { store, later } = setup()
    const trip = await store.start(turn(1))
    later()
    const work = await store.start(turn(1))
    later()

    await store.setTitle(trip, "Viaje a Lisboa")

    const listed = (await store.list()).sessions.map(({ id }) => id)
    expect(listed).toEqual([work, trip])
  })

  it("deletes a Session with all its Turns", async () => {
    const { store } = setup()
    const trip = await store.start(turn(1))
    await store.addTurn(trip, turn(2))
    const work = await store.start(turn(10))

    await store.delete(trip)

    expect(await store.transcript(trip)).toBeNull()
    expect(await store.recentTurns(trip)).toBeNull()
    expect(await store.get(trip)).toBeNull()
    expect((await store.list()).sessions.map(({ id }) => id)).toEqual([work])
    expect(await store.transcript(work)).toEqual([turn(10)])
  })

  it("starts a deleted Session's id afresh, without its old Turns", async () => {
    const ids = ["reused", "reused"]
    const store = createSessionStore(openDatabase(":memory:"), {
      newId: () => ids.shift()!,
    })
    await store.start(turn(1))
    await store.addTurn("reused", turn(2))

    await store.delete("reused")
    await store.start(turn(3))

    expect(await store.transcript("reused")).toEqual([turn(3)])
  })

  it("can't add a Turn to a deleted Session", async () => {
    const { store } = setup()
    const id = await store.start(turn(1))

    await store.delete(id)

    await expect(store.addTurn(id, turn(2))).rejects.toBeInstanceOf(
      UnknownSessionError
    )
  })
})
