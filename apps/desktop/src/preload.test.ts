import { beforeEach, describe, expect, it, vi } from "vitest"

import { JARVIS_STATE_CHANNEL, PAGE_CHANNEL } from "./channels.js"
import type { JarvisAppApi } from "./preload.cjs"
import type { JarvisPageMessage } from "./ports.js"

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

  it("publishes the page's Jarvis State, and nothing else", async () => {
    const jarvisApp = await loadPreload()

    jarvisApp.publishJarvisState("listening")
    jarvisApp.publishJarvisState("<script>")

    expect(electron.sent).toEqual([
      { channel: JARVIS_STATE_CHANNEL, args: ["listening"] },
    ])
  })
})
