import { describe, expect, it } from "vitest"

import { openDatabase } from "../db"
import { createSessionStore, type SavedTurn } from "./store"
import { titleSession } from "./titles"

function setup(generate: (turn: SavedTurn) => Promise<string>) {
  const store = createSessionStore(openDatabase(":memory:"))
  const asked: SavedTurn[] = []
  const title = (sessionId: string) =>
    titleSession(sessionId, {
      store,
      generate: async (turn) => {
        asked.push(turn)
        return generate(turn)
      },
    })
  const titleOf = async (id: string) =>
    (await store.list()).sessions.find((session) => session.id === id)?.title
  return { store, title, titleOf, asked }
}

const FIRST = { owner: "Voy a Lisboa el viernes", reply: "Buen viaje, señor." }

describe("titleSession", () => {
  it("titles a Session from its first Turn", async () => {
    const { store, title, titleOf, asked } = setup(async () => "Viaje a Lisboa")
    const id = await store.start(FIRST)
    await store.addTurn(id, { owner: "¿Y el tiempo?", reply: "Soleado." })

    await title(id)

    expect(asked).toEqual([FIRST])
    expect(await titleOf(id)).toBe("Viaje a Lisboa")
  })

  it("tidies what the model returns", async () => {
    const { store, title, titleOf } = setup(async () => '  "Viaje a Lisboa."\n')
    const id = await store.start(FIRST)

    await title(id)

    expect(await titleOf(id)).toBe("Viaje a Lisboa")
  })

  it("leaves the Session untitled when generation fails", async () => {
    const { store, title, titleOf } = setup(async () => {
      throw new Error("Nan 500")
    })
    const id = await store.start(FIRST)

    await expect(title(id)).resolves.toBeUndefined()

    expect(await titleOf(id)).toBeNull()
  })

  it("leaves the Session untitled when the model returns nothing", async () => {
    const { store, title, titleOf } = setup(async () => '  ""  ')
    const id = await store.start(FIRST)

    await title(id)

    expect(await titleOf(id)).toBeNull()
  })

  it("never retitles a Session", async () => {
    const { store, title, titleOf, asked } = setup(async () => "Otro título")
    const id = await store.start(FIRST)
    await store.setTitle(id, "Viaje a Lisboa")

    await title(id)

    expect(asked).toEqual([])
    expect(await titleOf(id)).toBe("Viaje a Lisboa")
  })

  it("does nothing for an unknown Session", async () => {
    const { title, asked } = setup(async () => "Viaje a Lisboa")

    await title("nope")

    expect(asked).toEqual([])
  })
})
