import { describe, expect, it } from "vitest"

import { openDatabase, type JarvisDatabase } from "../db"
import {
  BROWSE_CHECK_INTERVAL_MS,
  BROWSE_TIME_LIMIT_MS,
  createBrowse,
} from "./browse"
import { fakeBrowserPort, watch } from "./fixtures"
import type { BrowserPort, BrowserWatch } from "./port"

const NOW = new Date("2026-10-14T12:00:00Z")

const PRADO = {
  task: "Mira el horario del Museo del Prado para hoy",
  startUrl: "https://www.museodelprado.es",
}

const FINISHED = watch({
  status: "finished",
  step: 10,
  currentGoal: null,
  screenshotUrl: "https://cdn.browser-use.com/screenshots/task-1/10.png",
  output: "Abre hoy de 10:00 a 20:00.",
  success: true,
})

/**
 * A Browse module over a fresh in-memory database and a fake browser port
 * serving `watches` in order, with a clock the test moves by hand.
 */
function setup(
  watches?: BrowserWatch[],
  options: { db?: JarvisDatabase; port?: BrowserPort } = {}
) {
  const db = options.db ?? openDatabase(":memory:")
  const fake = fakeBrowserPort(watches)
  const clock = { now: NOW }
  const browse = createBrowse({
    db,
    port: options.port ?? fake.port,
    now: () => clock.now,
  })
  /** Moves the clock forward by `ms`. */
  const later = (ms: number) => {
    clock.now = new Date(clock.now.getTime() + ms)
  }
  return { browse, db, clock, later, ...fake }
}

const AFTER_CHECK = BROWSE_CHECK_INTERVAL_MS + 1

describe("Browse", () => {
  it("has no Browse Task to begin with", async () => {
    const { browse } = setup()

    expect(await browse.current()).toBeNull()
  })

  it("starts a Browse Task wrapped in read-only instructions, never with secrets", async () => {
    const { browse, calls } = setup()

    const { view, stopped } = await browse.start(PRADO)

    expect(stopped).toBeNull()
    expect(calls.start).toHaveLength(1)
    const sent = calls.start[0]!
    expect(Object.keys(sent).sort()).toEqual(["startUrl", "task"])
    expect(sent.startUrl).toBe(PRADO.startUrl)
    expect(sent.task).toContain(PRADO.task)
    expect(sent.task).not.toBe(PRADO.task)
    expect(sent.task).toMatch(/log in/i)
    expect(view).toEqual({
      task: PRADO.task,
      startUrl: PRADO.startUrl,
      status: "running",
      currentGoal: null,
      currentUrl: PRADO.startUrl,
      liveViewUrl: "https://live.browser-use.com?wss=browser-1",
      screenshotUrl: null,
      outcome: null,
      success: null,
      startedAt: NOW,
      endedAt: null,
    })
    expect(await browse.current()).toEqual(view)
  })

  it("starts with no start URL when the model gives none", async () => {
    const { browse, calls } = setup()

    const { view } = await browse.start({ task: PRADO.task })

    expect(calls.start[0]).toEqual({ task: expect.any(String) })
    expect(view.startUrl).toBeNull()
    expect(view.currentUrl).toBeNull()
  })

  it("still starts without a live view when getting it fails", async () => {
    const { browse, failures } = setup()
    failures.liveView = true

    const { view } = await browse.start(PRADO)

    expect(view.status).toBe("running")
    expect(view.liveViewUrl).toBeNull()
  })

  it("throws when the remote browser can't start, saving nothing", async () => {
    const { browse, failures } = setup()
    failures.start = true

    await expect(browse.start(PRADO)).rejects.toThrow()
    expect(await browse.current()).toBeNull()
  })

  it("brings a running Browse Task up to date only once the check interval has passed", async () => {
    const { browse, calls, later } = setup([
      watch({
        step: 3,
        currentGoal: "I will open the visit page.",
        currentUrl: "https://www.museodelprado.es/visita",
        screenshotUrl: "https://cdn.browser-use.com/screenshots/task-1/3.png",
      }),
    ])
    await browse.start(PRADO)

    later(BROWSE_CHECK_INTERVAL_MS - 1)
    await browse.current()
    expect(calls.watch).toEqual([])

    later(2)
    const view = await browse.current()
    expect(calls.watch).toEqual([{ taskId: "task-1", lastStep: 0 }])
    expect(view).toMatchObject({
      status: "running",
      currentGoal: "I will open the visit page.",
      currentUrl: "https://www.museodelprado.es/visita",
      screenshotUrl: "https://cdn.browser-use.com/screenshots/task-1/3.png",
    })

    await browse.current()
    expect(calls.watch).toHaveLength(1)
    later(AFTER_CHECK)
    await browse.current()
    expect(calls.watch.at(-1)).toEqual({ taskId: "task-1", lastStep: 3 })
  })

  it("keeps the last screenshot and goal when a refresh brings no new steps", async () => {
    const { browse, later } = setup([
      watch({ step: 3, currentGoal: "Open the menu", screenshotUrl: "a.png" }),
      watch({ step: 3, currentGoal: null, screenshotUrl: null }),
    ])
    await browse.start(PRADO)
    later(AFTER_CHECK)
    await browse.current()

    later(AFTER_CHECK)
    expect(await browse.current()).toMatchObject({
      currentGoal: "Open the menu",
      screenshotUrl: "a.png",
    })
  })

  it("saves the outcome when the Browse Task finishes, frees the remote browser and stops checking", async () => {
    const { browse, calls, later, clock } = setup([FINISHED])
    await browse.start(PRADO)
    later(AFTER_CHECK)

    const view = await browse.current()

    expect(view).toMatchObject({
      status: "finished",
      outcome: "Abre hoy de 10:00 a 20:00.",
      success: true,
      liveViewUrl: null,
      screenshotUrl: "https://cdn.browser-use.com/screenshots/task-1/10.png",
      endedAt: clock.now,
    })
    expect(calls.stop).toEqual(["task-1"])

    later(AFTER_CHECK * 10)
    expect(await browse.current()).toEqual(view)
    expect(calls.watch).toHaveLength(1)
  })

  it("records a Browse Task that failed, with no outcome to keep from a stop", async () => {
    const { browse, later } = setup([
      watch({ status: "failed", output: "Could not load the page" }),
    ])
    await browse.start(PRADO)
    later(AFTER_CHECK)

    expect(await browse.current()).toMatchObject({
      status: "failed",
      outcome: "Could not load the page",
    })
  })

  it("keeps the outcome when freeing the remote browser fails", async () => {
    const { browse, later, failures } = setup([FINISHED])
    await browse.start(PRADO)
    failures.stop = true
    later(AFTER_CHECK)

    expect(await browse.current()).toMatchObject({ status: "finished" })
  })

  it("stops the running Browse Task when another one starts", async () => {
    const { browse, calls } = setup()
    await browse.start(PRADO)

    const { view, stopped } = await browse.start({
      task: "Mira el precio de una maleta en Ryanair",
    })

    expect(calls.stop).toEqual(["task-1"])
    expect(stopped).toMatchObject({ task: PRADO.task, status: "stopped" })
    expect(view.task).toBe("Mira el precio de una maleta en Ryanair")
    expect(await browse.current()).toEqual(view)
  })

  it("replaces an ended Browse Task without stopping anything", async () => {
    const { browse, calls, later } = setup([FINISHED])
    await browse.start(PRADO)
    later(AFTER_CHECK)
    await browse.current()

    const { stopped } = await browse.start({ task: "Otra cosa que mirar" })

    expect(stopped).toBeNull()
    expect(calls.stop).toEqual(["task-1"])
  })

  it("stops the running Browse Task", async () => {
    const { browse, calls, clock } = setup()
    await browse.start(PRADO)

    const stopped = await browse.stop()

    expect(calls.stop).toEqual(["task-1"])
    expect(stopped).toMatchObject({
      task: PRADO.task,
      status: "stopped",
      liveViewUrl: null,
      endedAt: clock.now,
    })
    expect(await browse.current()).toEqual(stopped)
  })

  it("reports that nothing is running when there is nothing to stop", async () => {
    const { browse, calls, later } = setup([FINISHED])

    expect(await browse.stop()).toBeNull()

    await browse.start(PRADO)
    later(AFTER_CHECK)
    await browse.current()
    expect(await browse.stop()).toBeNull()
    expect(calls.stop).toEqual(["task-1"])
  })

  it("throws and keeps it running when the remote browser can't be stopped", async () => {
    const { browse, failures } = setup()
    await browse.start(PRADO)
    failures.stop = true

    await expect(browse.stop()).rejects.toThrow()
    expect(await browse.current()).toMatchObject({ status: "running" })
  })

  it("stops a Browse Task that runs past the time limit and records why", async () => {
    const { browse, calls, later } = setup()
    await browse.start(PRADO)

    later(BROWSE_TIME_LIMIT_MS)
    const view = await browse.current()

    expect(calls.stop).toEqual(["task-1"])
    expect(view).toMatchObject({ status: "timed-out", liveViewUrl: null })
    expect(view?.outcome).toMatch(/10 minutos/)
  })

  it("keeps the last known view when the port fails, and tries again later", async () => {
    const { browse, calls, later, failures } = setup()
    const { view } = await browse.start(PRADO)
    failures.watch = true

    later(AFTER_CHECK)
    expect(await browse.current()).toEqual(view)

    later(AFTER_CHECK)
    await browse.current()
    expect(calls.watch).toHaveLength(2)
  })

  it("gives the last known view without waiting for a slow refresh, and refreshes once at a time", async () => {
    let finish!: (watch: BrowserWatch) => void
    const fake = fakeBrowserPort()
    const watches: string[] = []
    const port: BrowserPort = {
      ...fake.port,
      watch: (taskId) => {
        watches.push(taskId)
        return new Promise((resolve) => (finish = resolve))
      },
    }
    const db = openDatabase(":memory:")
    const clock = { now: NOW }
    const browse = createBrowse({
      db,
      port,
      now: () => clock.now,
      waitForRefreshMs: 5,
    })
    const { view } = await browse.start(PRADO)

    clock.now = new Date(NOW.getTime() + AFTER_CHECK)
    expect(await browse.current()).toEqual(view)
    clock.now = new Date(NOW.getTime() + AFTER_CHECK * 2)
    expect(await browse.current()).toEqual(view)
    expect(watches).toHaveLength(1)

    finish(FINISHED)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await browse.current()).toMatchObject({ status: "finished" })
  })

  it("ignores a late refresh of a Browse Task that was replaced meanwhile", async () => {
    let finish!: (watch: BrowserWatch) => void
    const fake = fakeBrowserPort()
    const port: BrowserPort = {
      ...fake.port,
      watch: () => new Promise((resolve) => (finish = resolve)),
    }
    const clock = { now: NOW }
    const browse = createBrowse({
      db: openDatabase(":memory:"),
      port,
      now: () => clock.now,
      waitForRefreshMs: 5,
    })
    await browse.start(PRADO)
    clock.now = new Date(NOW.getTime() + AFTER_CHECK)
    await browse.current()

    const { view } = await browse.start({ task: "Otra cosa que mirar" })
    finish(FINISHED)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(await browse.current()).toEqual(view)
  })

  it("is seen by a fresh module over the same database, as after a reload", async () => {
    const first = setup([FINISHED])
    const { view } = await first.browse.start(PRADO)

    const second = setup([FINISHED], { db: first.db })
    expect(await second.browse.current()).toEqual(view)

    second.later(AFTER_CHECK)
    expect(await second.browse.current()).toMatchObject({
      status: "finished",
    })
    expect(second.calls.watch).toEqual([{ taskId: "task-1", lastStep: 0 }])
  })
})
