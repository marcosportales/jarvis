/**
 * The preload script of the Jarvis App's windows: exposes `window.jarvisApp`,
 * a small typed API, to Jarvis's pages. Only the Jarvis App has it; a
 * browser tab doesn't. The page side is the App Bridge in
 * `apps/web/lib/jarvis/app-bridge.ts`, which mirrors this API's type.
 *
 * The windows are sandboxed, so this file may `require` nothing but
 * `electron`, and is CommonJS: it can't share code, even the channel names in
 * `channels.ts`, with the rest of the Jarvis App.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"

const PAGE_CHANNEL = "jarvis-app:page"
const JARVIS_STATE_CHANNEL = "jarvis-app:jarvis-state"

const JARVIS_STATES = new Set(["idle", "listening", "thinking", "speaking"])

type PushToTalkAction = "press" | "release"

const jarvisApp = {
  /**
   * Push-to-talk held from the Jarvis App: the key from any other app.
   * Returns a function that stops listening.
   */
  onPushToTalk(listener: (action: PushToTalkAction) => void): () => void {
    const onMessage = (_event: IpcRendererEvent, message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "push-to-talk" &&
        "action" in message &&
        (message.action === "press" || message.action === "release")
      ) {
        listener(message.action)
      }
    }
    ipcRenderer.on(PAGE_CHANNEL, onMessage)
    return () => {
      ipcRenderer.removeListener(PAGE_CHANNEL, onMessage)
    }
  },

  /** Hands the Jarvis App the page's Jarvis State. */
  publishJarvisState(state: string): void {
    if (JARVIS_STATES.has(state)) ipcRenderer.send(JARVIS_STATE_CHANNEL, state)
  },
}

export type JarvisAppApi = typeof jarvisApp

contextBridge.exposeInMainWorld("jarvisApp", jarvisApp)
