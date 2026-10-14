import { describe, expect, it } from "vitest"

import {
  connectAppBridge,
  returnToJarvisOnPushToTalk,
  type JarvisAppApi,
} from "./app-bridge"
import { createPushToTalk } from "./push-to-talk"
import { DISCARDED_UTTERANCE_HINT, type JarvisState } from "./session"
import { fakeRecorder, flush, setup } from "./session-fakes"

/** The Jarvis App's preload API, as the Jarvis page sees it. */
function fakeJarvisApp() {
  let listener: ((action: "press" | "release") => void) | undefined
  const published: JarvisState[] = []
  const app: Pick<JarvisAppApi, "onPushToTalk" | "publishJarvisState"> = {
    onPushToTalk(next) {
      listener = next
      return () => {
        listener = undefined
      }
    },
    publishJarvisState: (state) => published.push(state),
  }
  return {
    app,
    published,
    /** The Owner holds Push-to-talk from another app. */
    press: () => listener?.("press"),
    release: () => listener?.("release"),
    get listening() {
      return listener !== undefined
    },
  }
}

/** A Jarvis Session on a Jarvis page inside the Jarvis App. */
function setupInApp(options: Parameters<typeof setup>[0] = {}) {
  const jarvis = setup(options)
  const pushToTalk = createPushToTalk(jarvis.session)
  const jarvisApp = fakeJarvisApp()
  const disconnect = connectAppBridge({
    session: jarvis.session,
    pushToTalk,
    app: jarvisApp.app,
  })
  return { ...jarvis, pushToTalk, jarvisApp, disconnect }
}

describe("The App Bridge", () => {
  it("makes a Turn from a Jarvis App press then release", async () => {
    const { jarvisApp, brain, voice, states, transcript } = setupInApp()

    jarvisApp.press()
    await flush()
    jarvisApp.release()
    await flush()
    brain.answer("Buenas tardes, señor.")
    await flush()
    voice.finish()
    await flush()

    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
    expect(voice.spoken).toEqual(["Buenas tardes, señor."])
    expect(states).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
      "idle",
    ])
    expect(transcript()).toEqual([
      { role: "owner", text: "Hola Jarvis" },
      { role: "jarvis", text: "Buenas tardes, señor." },
    ])
  })

  it("discards a short hold with the usual hint", async () => {
    const { session, jarvisApp, brain, transcript } = setupInApp({
      recorder: fakeRecorder({ durationMs: 300 }),
    })

    jarvisApp.press()
    await flush()
    jarvisApp.release()
    await flush()

    expect(brain.calls).toEqual([])
    expect(transcript()).toEqual([])
    expect(session.getSnapshot().hint).toBe(DISCARDED_UTTERANCE_HINT)
    expect(session.getSnapshot().state).toBe("idle")
  })

  it("cuts the Reply short when pressed while Speaking", async () => {
    const { session, jarvisApp, brain, voice } = setupInApp()
    void session.sendTypedMessage("Cuéntame algo")
    await flush()
    brain.answer("Había una vez un mayordomo muy paciente.")
    await flush()
    expect(session.getSnapshot().state).toBe("speaking")

    jarvisApp.press()
    await flush()

    expect(voice.stopped()).toBe(1)
    expect(session.getSnapshot().state).toBe("listening")
  })

  it("publishes the Jarvis State on connecting and on every change", async () => {
    const { jarvisApp, brain, voice } = setupInApp()

    jarvisApp.press()
    await flush()
    jarvisApp.release()
    await flush()
    brain.answer("Buenas tardes, señor.")
    await flush()
    voice.finish()
    await flush()

    expect(jarvisApp.published).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
      "idle",
    ])
  })

  it("keeps a Jarvis App hold through a window blur", async () => {
    const { session, pushToTalk, jarvisApp, brain } = setupInApp()

    jarvisApp.press()
    await flush()
    pushToTalk.windowBlurred()
    await flush()

    expect(session.getSnapshot().state).toBe("listening")

    jarvisApp.release()
    await flush()

    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
  })

  it("still ends a Space hold on a window blur", async () => {
    const { session, pushToTalk, brain } = setupInApp()

    pushToTalk.press("space")
    await flush()
    pushToTalk.windowBlurred()
    await flush()

    expect(session.getSnapshot().state).not.toBe("listening")
    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
  })

  it("leaves a Space hold alone when the Jarvis App releases", async () => {
    const { session, pushToTalk, jarvisApp } = setupInApp()

    pushToTalk.press("space")
    await flush()
    jarvisApp.press()
    jarvisApp.release()
    await flush()

    expect(session.getSnapshot().state).toBe("listening")
  })

  it("stops relaying and publishing once disconnected", async () => {
    const { session, jarvisApp, disconnect } = setupInApp()

    disconnect()
    jarvisApp.published.length = 0
    jarvisApp.press()
    void session.sendTypedMessage("¿Qué hora es?")
    await flush()

    expect(jarvisApp.listening).toBe(false)
    expect(jarvisApp.published).toEqual([])
  })

  it("publishes Idle on disconnecting, since the page's Session is gone", async () => {
    // e.g. the Owner opens the Marketplace while Jarvis is Speaking: the
    // Session is silenced, and the Floating Orb must not stay on Speaking.
    const { session, jarvisApp, brain, disconnect } = setupInApp()
    void session.sendTypedMessage("Cuéntame algo")
    await flush()
    brain.answer("Había una vez un mayordomo muy paciente.")
    await flush()
    expect(jarvisApp.published.at(-1)).toBe("speaking")

    disconnect()

    expect(jarvisApp.published.at(-1)).toBe("idle")
  })

  it("starts Listening at once when connected during a Jarvis App hold", async () => {
    // The Jarvis App replays a hold still going on to a page that starts
    // listening mid-hold, e.g. after leaving the Marketplace for it.
    const { session, brain } = setup()
    const jarvisApp = fakeJarvisApp()
    jarvisApp.press()
    connectAppBridge({
      session,
      pushToTalk: createPushToTalk(session),
      app: {
        ...jarvisApp.app,
        onPushToTalk(listener) {
          const stop = jarvisApp.app.onPushToTalk(listener)
          listener("press")
          return stop
        },
      },
    })
    await flush()
    expect(session.getSnapshot().state).toBe("listening")
    expect(jarvisApp.published).toEqual(["idle", "listening"])

    jarvisApp.release()
    await flush()

    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
  })
})

describe("Push-to-talk on a page without a Session", () => {
  it("goes back to the Jarvis page on a Jarvis App press", () => {
    const jarvisApp = fakeJarvisApp()
    const visits: string[] = []
    returnToJarvisOnPushToTalk({
      app: jarvisApp.app,
      goToJarvisPage: () => visits.push("/"),
    })

    jarvisApp.press()
    jarvisApp.release()

    expect(visits).toEqual(["/"])
  })

  it("stays once it stops listening, and does nothing without the Jarvis App", () => {
    const jarvisApp = fakeJarvisApp()
    const visits: string[] = []
    const stop = returnToJarvisOnPushToTalk({
      app: jarvisApp.app,
      goToJarvisPage: () => visits.push("/"),
    })

    stop()
    jarvisApp.press()

    expect(visits).toEqual([])
    expect(() =>
      returnToJarvisOnPushToTalk({
        app: undefined,
        goToJarvisPage: () => visits.push("/"),
      })()
    ).not.toThrow()
  })
})

describe("Without the Jarvis App", () => {
  it("wires nothing, and Push-to-talk works as before", async () => {
    const { session, brain } = setup()
    const pushToTalk = createPushToTalk(session)

    const disconnect = connectAppBridge({ session, pushToTalk, app: undefined })
    pushToTalk.press("space")
    await flush()
    pushToTalk.release("space")
    await flush()

    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
    expect(() => disconnect()).not.toThrow()
  })
})
