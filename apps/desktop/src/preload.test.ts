import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  FLOATING_ORB_CHANNEL,
  JARVIS_STATE_CHANNEL,
  PAGE_CHANNEL,
} from "./channels.js"
import {
  FLOATING_ORB_GESTURES,
  JARVIS_STATES,
  type JarvisAppApi,
  type JarvisState,
} from "./page-api.js"
import type { FloatingOrbPageMessage, JarvisPageMessage } from "./ports.js"

/** Electron's renderer side, as far as the preload script uses it. */
const electron = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  return {
    exposed: {} as Record<string, unknown>,
    sent: [] as { channel: string; args: unknown[] }[],
    listeners,
    contextBridge: {
      exposeInMainWorld(key: string, api: unknown) {
        electron.exposed[key] = api
      },
    },
    ipcRenderer: {
      on(channel: string, listener: (...args: unknown[]) => void) {
        if (!listeners.has(channel)) listeners.set(channel, new Set())
        listeners.get(channel)!.add(listener)
      },
      removeListener(channel: string, listener: (...args: unknown[]) => void) {
        listeners.get(channel)?.delete(listener)
      },
      send(channel: string, ...args: unknown[]) {
        electron.sent.push({ channel, args })
      },
    },
  }
})

vi.mock("electron", () => ({
  contextBridge: electron.contextBridge,
  ipcRenderer: electron.ipcRenderer,
}))

/** The Jarvis App sends the page a message, as `sendToJarvis` does. */
function sendToPage(message: unknown) {
  for (const listener of electron.listeners.get(PAGE_CHANNEL) ?? []) {
    listener({}, message)
  }
}

async function loadPreload() {
  vi.resetModules()
  await import("./preload.cjs")
  return electron.exposed.jarvisApp as JarvisAppApi
}

beforeEach(() => {
  electron.exposed = {}
  electron.sent = []
  electron.listeners.clear()
})

describe("The preload script", () => {
  it("relays Push-to-talk from the Jarvis App to the page", async () => {
    const jarvisApp = await loadPreload()
    const actions: string[] = []
    jarvisApp.onPushToTalk((action) => actions.push(action))

    for (const action of ["press", "release"] as const) {
      sendToPage({ type: "push-to-talk", action } satisfies JarvisPageMessage)
    }
    sendToPage({ type: "push-to-talk", action: "explode" })
    sendToPage("press")

    expect(actions).toEqual(["press", "release"])
  })

  it("stops relaying once the page stops listening", async () => {
    const jarvisApp = await loadPreload()
    const actions: string[] = []
    const stop = jarvisApp.onPushToTalk((action) => actions.push(action))

    stop()
    sendToPage({ type: "push-to-talk", action: "press" })

    expect(actions).toEqual([])
  })

  it("hands a page that starts listening mid-hold the press at once", async () => {
    // e.g. a press on the Marketplace takes the window to the Jarvis page,
    // whose Session starts listening while the key is still held.
    const jarvisApp = await loadPreload()
    sendToPage({ type: "push-to-talk", action: "press" })

    const actions: string[] = []
    jarvisApp.onPushToTalk((action) => actions.push(action))
    sendToPage({ type: "push-to-talk", action: "release" })

    expect(actions).toEqual(["press", "release"])
  })

  it("doesn't hand a later page a hold that has ended", async () => {
    const jarvisApp = await loadPreload()
    sendToPage({ type: "push-to-talk", action: "press" })
    sendToPage({ type: "push-to-talk", action: "release" })

    const actions: string[] = []
    jarvisApp.onPushToTalk((action) => actions.push(action))

    expect(actions).toEqual([])
  })

  it("publishes the page's Jarvis State, and nothing else", async () => {
    const jarvisApp = await loadPreload()

    jarvisApp.publishJarvisState("listening")
    jarvisApp.publishJarvisState("<script>" as JarvisState)

    expect(electron.sent).toEqual([
      { channel: JARVIS_STATE_CHANNEL, args: ["listening"] },
    ])
  })

  it("publishes every Jarvis State there is", async () => {
    // The preload repeats the Jarvis States; none may be missing.
    const jarvisApp = await loadPreload()

    for (const state of JARVIS_STATES) jarvisApp.publishJarvisState(state)

    expect(electron.sent).toEqual(
      JARVIS_STATES.map((state) => ({
        channel: JARVIS_STATE_CHANNEL,
        args: [state],
      }))
    )
  })
})

describe("The preload script on the Floating Orb", () => {
  function sendJarvisState(state: unknown) {
    sendToPage({ type: "jarvis-state", state })
  }

  it("hands the page every Jarvis State the Jarvis App sends, and nothing else", async () => {
    const jarvisApp = await loadPreload()
    const states: string[] = []
    jarvisApp.onJarvisState((state) => states.push(state))

    for (const state of [
      "listening",
      "thinking",
      "speaking",
      "idle",
    ] as const) {
      sendToPage({
        type: "jarvis-state",
        state,
      } satisfies FloatingOrbPageMessage)
    }
    sendJarvisState("asleep")
    sendToPage({ type: "push-to-talk", action: "press" })

    expect(states).toEqual(["listening", "thinking", "speaking", "idle"])
  })

  it("hands a late listener the latest Jarvis State at once", async () => {
    const jarvisApp = await loadPreload()
    sendJarvisState("listening")
    sendJarvisState("thinking")

    const states: string[] = []
    jarvisApp.onJarvisState((state) => states.push(state))
    sendJarvisState("speaking")

    expect(states).toEqual(["thinking", "speaking"])
  })

  it("stops handing states once the page stops listening", async () => {
    const jarvisApp = await loadPreload()
    const states: string[] = []
    const stop = jarvisApp.onJarvisState((state) => states.push(state))

    stop()
    sendJarvisState("listening")

    expect(states).toEqual([])
  })

  it("sends the Owner's holds and clicks to the Jarvis App, and nothing else", async () => {
    const jarvisApp = await loadPreload()

    for (const gesture of FLOATING_ORB_GESTURES) {
      jarvisApp.sendFloatingOrbGesture(gesture)
    }
    jarvisApp.sendFloatingOrbGesture("drag" as "click")

    expect(electron.sent).toEqual([
      { channel: FLOATING_ORB_CHANNEL, args: ["press"] },
      { channel: FLOATING_ORB_CHANNEL, args: ["release"] },
      { channel: FLOATING_ORB_CHANNEL, args: ["click"] },
    ])
  })
})
