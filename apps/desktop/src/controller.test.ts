import { describe, expect, it } from "vitest"

import { createAppController } from "./controller.js"
import type { FloatingOrbPageMessage, JarvisPageMessage } from "./ports.js"

const ORIGIN = "http://localhost:3000"

/** A promise settled from outside, for a server that answers when told to. */
function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** The Jarvis App over fake ports, recording what the Owner would see. */
function fakeApp({
  withTray = true,
  logFile,
}: { withTray?: boolean; logFile?: string } = {}) {
  const ready = deferred()
  const state = {
    serverRunning: false,
    jarvisUrl: undefined as string | undefined,
    jarvisVisible: false,
    jarvisFocused: false,
    pageMessages: [] as JarvisPageMessage[],
    floatingOrbUrl: undefined as string | undefined,
    floatingOrbVisible: false,
    floatingOrbMessages: [] as FloatingOrbPageMessage[],
    openedInBrowser: [] as string[],
    errors: [] as { title: string; detail: string }[],
    exited: false,
    /** What happened, in order, where order matters. */
    events: [] as string[],
  }
  let serverExit: ((reason: string) => void) | undefined
  let trayActions: { showJarvis(): void; quit(): void } | undefined
  let pushToTalk: { pressed(): void; released(): void } | undefined

  const controller = createAppController({
    origin: ORIGIN,
    logFile,
    server: {
      start: async () => {
        state.serverRunning = true
      },
      waitUntilReady: () => ready.promise,
      stop: async () => {
        await settle()
        state.serverRunning = false
        state.events.push("server stopped")
      },
      onExit: (listener) => {
        serverExit = listener
      },
    },
    windows: {
      openJarvis: async (url) => {
        state.jarvisUrl = url
      },
      showJarvis: () => {
        if (!state.jarvisUrl) throw new Error("No Jarvis window yet")
        state.jarvisVisible = true
      },
      hideJarvis: () => {
        state.jarvisVisible = false
        state.jarvisFocused = false
      },
      focusJarvis: () => {
        if (!state.jarvisUrl) throw new Error("No Jarvis window yet")
        state.jarvisFocused = true
      },
      sendToJarvis: (message) => state.pageMessages.push(message),
      openFloatingOrb: async (url) => {
        state.floatingOrbUrl = url
      },
      showFloatingOrb: () => {
        if (!state.floatingOrbUrl) throw new Error("No Floating Orb yet")
        state.floatingOrbVisible = true
      },
      sendToFloatingOrb: (message) => {
        if (!state.floatingOrbUrl) throw new Error("No Floating Orb yet")
        state.floatingOrbMessages.push(message)
      },
    },
    shortcuts: {
      onPushToTalk: (listeners) => {
        pushToTalk = listeners
      },
    },
    tray: withTray
      ? {
          show: (actions) => {
            trayActions = actions
          },
        }
      : undefined,
    shell: {
      openInBrowser: (url) => state.openedInBrowser.push(url),
    },
    dialogs: {
      showError: (title, detail) => {
        state.errors.push({ title, detail })
        state.events.push("error shown")
      },
    },
    exit: () => {
      state.exited = true
      state.events.push("exited")
    },
  })

  return {
    controller,
    state,
    /** Jarvis's server starts answering. */
    serverAnswers: async () => {
      ready.resolve()
      await settle()
    },
    serverNeverAnswers: async (reason: string) => {
      ready.reject(new Error(reason))
      await settle()
    },
    serverDies: async (reason: string) => {
      serverExit?.(reason)
      await settle()
    },
    get tray() {
      return trayActions
    },
    get pushToTalk() {
      return pushToTalk!
    },
  }
}

describe("Launching the Jarvis App", () => {
  it("shows the Jarvis window only once the server answers", async () => {
    const app = fakeApp()

    const launched = app.controller.launch([])
    await settle()
    expect(app.state.serverRunning).toBe(true)
    expect(app.state.jarvisVisible).toBe(false)

    await app.serverAnswers()
    await launched
    expect(app.state.jarvisUrl).toBe(`${ORIGIN}/`)
    expect(app.state.jarvisVisible).toBe(true)
  })

  it("keeps the window hidden when launched with --hidden", async () => {
    const app = fakeApp()

    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    expect(app.state.jarvisUrl).toBe(`${ORIGIN}/`)
    expect(app.state.jarvisVisible).toBe(false)
  })

  it("shows an error and quits when the server never answers", async () => {
    const app = fakeApp()

    const launched = app.controller.launch([])
    await app.serverNeverAnswers("Nothing answered on port 3000")
    await launched

    expect(app.state.errors).toEqual([
      {
        title: expect.any(String),
        detail: expect.stringContaining("Nothing answered on port 3000"),
      },
    ])
    expect(app.state.jarvisVisible).toBe(false)
    expect(app.state.exited).toBe(true)
  })

  it("says where the log is when the server never answers", async () => {
    const app = fakeApp({ logFile: "/home/owner/.config/Jarvis/jarvis.log" })

    const launched = app.controller.launch(["--hidden"])
    await app.serverNeverAnswers("listen EADDRINUSE 127.0.0.1:3737")
    await launched

    expect(app.state.errors).toEqual([
      {
        title: expect.any(String),
        detail: expect.stringMatching(
          /EADDRINUSE 127\.0\.0\.1:3737[\s\S]*\/home\/owner\/\.config\/Jarvis\/jarvis\.log/
        ),
      },
    ])
    // The error dialog blocks the Jarvis App, so the server is stopped, and
    // its log written out, before it shows.
    expect(app.state.events).toEqual([
      "server stopped",
      "error shown",
      "exited",
    ])
  })

  it("exits at once when launched only to quit", async () => {
    const app = fakeApp()

    await app.controller.launch(["--quit"])

    expect(app.state.serverRunning).toBe(false)
    expect(app.state.jarvisUrl).toBeUndefined()
    expect(app.state.exited).toBe(true)
  })
})

describe("Launching it a second time", () => {
  it("shows and focuses the running Jarvis window", async () => {
    const app = fakeApp()
    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    app.controller.secondLaunch([])

    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.jarvisFocused).toBe(true)
  })

  it("shows the window once ready when the server is still starting", async () => {
    const app = fakeApp()
    const launched = app.controller.launch(["--hidden"])
    await settle()

    app.controller.secondLaunch([])
    expect(app.state.jarvisVisible).toBe(false)

    await app.serverAnswers()
    await launched
    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.jarvisFocused).toBe(true)
  })

  it("shows the window once ready when it came before a --hidden launch began", async () => {
    // Electron hands over a second launch as soon as it holds the lock,
    // before the app is ready and this one's launch has begun.
    const app = fakeApp()
    app.controller.secondLaunch([])

    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.jarvisFocused).toBe(true)
  })

  it("with --quit before the launch began, quits without starting anything", async () => {
    const app = fakeApp()
    app.controller.secondLaunch(["--quit"])
    await settle()
    await settle()

    await app.controller.launch([])

    expect(app.state.serverRunning).toBe(false)
    expect(app.state.jarvisUrl).toBeUndefined()
    expect(app.state.events).toEqual(["server stopped", "exited"])
  })

  it("with --quit, quits the running Jarvis App", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    app.controller.secondLaunch(["--quit"])
    await settle()
    await settle()

    expect(app.state.events).toEqual(["server stopped", "exited"])
  })
})

describe("Closing the Jarvis window", () => {
  it("hides it while Jarvis keeps running", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    const close = app.controller.closeJarvisWindow()

    expect(close).toBe("deny")
    expect(app.state.jarvisVisible).toBe(false)
    expect(app.state.serverRunning).toBe(true)
    expect(app.state.exited).toBe(false)
  })

  it("lets it close while quitting", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    const quitting = app.controller.quit()

    expect(app.controller.closeJarvisWindow()).toBe("allow")
    await quitting
  })
})

describe("Quitting", () => {
  it("stops the server, then exits", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    await app.controller.quit()

    expect(app.state.serverRunning).toBe(false)
    expect(app.state.events).toEqual(["server stopped", "exited"])
  })

  it("stops and exits only once when asked twice", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    await Promise.all([app.controller.quit(), app.controller.quit()])

    expect(app.state.events).toEqual(["server stopped", "exited"])
  })

  it("shows an error, then quits, when the server dies", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    await app.serverDies("exited with code 1")
    await settle()

    expect(app.state.errors).toEqual([
      {
        title: expect.any(String),
        detail: expect.stringContaining("exited with code 1"),
      },
    ])
    // The error dialog blocks the Jarvis App, so the server is stopped, and
    // its log written out, before it shows.
    expect(app.state.events).toEqual([
      "server stopped",
      "error shown",
      "exited",
    ])
  })

  it("says where the log is when the server dies", async () => {
    const app = fakeApp({ logFile: "/home/owner/.config/Jarvis/jarvis.log" })
    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    await app.serverDies("exited with code 1")
    await settle()

    expect(app.state.errors).toEqual([
      {
        title: expect.any(String),
        detail: expect.stringContaining(
          "/home/owner/.config/Jarvis/jarvis.log"
        ),
      },
    ])
    // The error dialog blocks the Jarvis App, so the server is stopped, and
    // its log written out, before it shows.
    expect(app.state.events).toEqual([
      "server stopped",
      "error shown",
      "exited",
    ])
  })

  it("shows no error when the server exits because Jarvis is quitting", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    const quitting = app.controller.quit()
    await app.serverDies("stopped")
    await quitting

    expect(app.state.errors).toEqual([])
  })
})

describe("The tray", () => {
  it("brings back the Jarvis window with Mostrar Jarvis", async () => {
    const app = fakeApp()
    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    app.tray!.showJarvis()

    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.jarvisFocused).toBe(true)
  })

  it("quits Jarvis with Salir", async () => {
    const app = fakeApp()
    const launched = app.controller.launch([])
    await app.serverAnswers()
    await launched

    app.tray!.quit()
    await settle()
    await settle()

    expect(app.state.events).toEqual(["server stopped", "exited"])
  })

  it("isn't needed: without one the Jarvis App still shows, hides and quits", async () => {
    const app = fakeApp({ withTray: false })
    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    app.controller.secondLaunch([])
    expect(app.state.jarvisVisible).toBe(true)

    app.controller.closeJarvisWindow()
    expect(app.state.jarvisVisible).toBe(false)

    app.controller.secondLaunch(["--quit"])
    await settle()
    await settle()
    expect(app.state.events).toEqual(["server stopped", "exited"])
  })
})

describe("Push-to-talk from any app", () => {
  it("reaches the Jarvis page without showing or focusing the window", async () => {
    const app = fakeApp()
    const launched = app.controller.launch(["--hidden"])
    await app.serverAnswers()
    await launched

    app.pushToTalk.pressed()
    app.pushToTalk.released()

    expect(app.state.pageMessages).toEqual([
      { type: "push-to-talk", action: "press" },
      { type: "push-to-talk", action: "release" },
    ])
    expect(app.state.jarvisVisible).toBe(false)
    expect(app.state.jarvisFocused).toBe(false)
  })

  it("is ignored before the Jarvis window is open", async () => {
    const app = fakeApp()
    void app.controller.launch([])
    await settle()

    app.pushToTalk.pressed()

    expect(app.state.pageMessages).toEqual([])
  })
})

describe("The Floating Orb", () => {
  async function launched(argv: string[] = ["--hidden"]) {
    const app = fakeApp()
    const launching = app.controller.launch(argv)
    await app.serverAnswers()
    await launching
    return app
  }

  it("is shown once the server answers, even when launched with --hidden", async () => {
    const app = fakeApp()
    const launching = app.controller.launch(["--hidden"])
    await settle()
    expect(app.state.floatingOrbVisible).toBe(false)

    await app.serverAnswers()
    await launching

    expect(app.state.floatingOrbUrl).toBe(`${ORIGIN}/floating-orb`)
    expect(app.state.floatingOrbVisible).toBe(true)
    expect(app.state.jarvisVisible).toBe(false)
  })

  it("is shown beside a shown Jarvis window", async () => {
    const app = await launched([])

    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.floatingOrbVisible).toBe(true)
  })

  it("receives every Jarvis State the Jarvis page publishes", async () => {
    const app = await launched()

    const states = ["listening", "thinking", "speaking", "idle"] as const
    for (const state of states) app.controller.jarvisState(state)

    expect(app.state.floatingOrbMessages).toEqual(
      states.map((state) => ({ type: "jarvis-state", state }))
    )
  })

  it("gets the latest Jarvis State published before it was open", async () => {
    const app = fakeApp()
    const launching = app.controller.launch([])
    await settle()

    app.controller.jarvisState("listening")
    app.controller.jarvisState("thinking")
    await app.serverAnswers()
    await launching

    expect(app.state.floatingOrbMessages).toEqual([
      { type: "jarvis-state", state: "thinking" },
    ])
  })

  it("relays a hold to the Jarvis page as Push-to-talk, without showing it", async () => {
    const app = await launched()

    app.controller.floatingOrb("press")
    app.controller.floatingOrb("release")

    expect(app.state.pageMessages).toEqual([
      { type: "push-to-talk", action: "press" },
      { type: "push-to-talk", action: "release" },
    ])
    expect(app.state.jarvisVisible).toBe(false)
    expect(app.state.jarvisFocused).toBe(false)
  })

  it("shows and focuses the Jarvis window when clicked", async () => {
    const app = await launched()

    app.controller.floatingOrb("click")

    expect(app.state.jarvisVisible).toBe(true)
    expect(app.state.jarvisFocused).toBe(true)
    expect(app.state.pageMessages).toEqual([])
  })

  it("stays open when something tries to close it, unless Jarvis is quitting", async () => {
    const app = await launched()

    expect(app.controller.closeFloatingOrb()).toBe("deny")
    expect(app.state.floatingOrbVisible).toBe(true)

    const quitting = app.controller.quit()
    expect(app.controller.closeFloatingOrb()).toBe("allow")
    await quitting
  })
})

describe("Leaving Jarvis's own pages", () => {
  it("opens an outside URL in the Owner's browser and cancels it in the app", async () => {
    const app = fakeApp()

    const navigation = app.controller.navigation(
      "https://accounts.google.com/o/oauth2/auth?state=abc"
    )

    expect(navigation).toBe("deny")
    expect(app.state.openedInBrowser).toEqual([
      "https://accounts.google.com/o/oauth2/auth?state=abc",
    ])
  })

  it("keeps Jarvis's own URLs in the app", () => {
    const app = fakeApp()

    expect(app.controller.navigation(`${ORIGIN}/plugins`)).toBe("allow")
    expect(app.controller.navigation(`${ORIGIN}/sessions/42?x=1`)).toBe("allow")
    expect(app.state.openedInBrowser).toEqual([])
  })

  it("treats another port or scheme on the same host as outside", () => {
    const app = fakeApp()

    expect(app.controller.navigation("http://localhost:3001/")).toBe("deny")
    expect(app.controller.navigation("https://localhost:3000/")).toBe("deny")
  })

  it("opens nothing for a URL that isn't one, or isn't for a browser", () => {
    const app = fakeApp()

    expect(app.controller.navigation("not a url")).toBe("deny")
    expect(app.controller.navigation("file:///etc/passwd")).toBe("deny")
    expect(app.state.openedInBrowser).toEqual([])
  })
})
