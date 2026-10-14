import { Variant } from "dbus-next"
import { describe, expect, it } from "vitest"

import type { DBus, DBusCall, DBusSignal } from "./dbus.js"
import { createPortalShortcuts, PUSH_TO_TALK_ID } from "./portal-shortcuts.js"

const PORTAL = "org.freedesktop.portal.Desktop"
const DESKTOP = "/org/freedesktop/portal/desktop"
const SHORTCUTS = "org.freedesktop.portal.GlobalShortcuts"
const UNIQUE_NAME = ":1.42"
const SESSION = `${DESKTOP}/session/1_42/jarvis`

/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * The session D-Bus with the desktop portal on it, playing its Global
 * Shortcuts flow: each request answers with a Response signal on its
 * request path, which is how the portal replies.
 */
function fakeSessionBus({
  portal = true,
  createSessionResponse = 0,
  boundShortcuts = [PUSH_TO_TALK_ID],
}: {
  /** Whether a desktop portal runs at all. */
  portal?: boolean
  /** 0 is success; 1 the Owner cancelled; 2 refused. */
  createSessionResponse?: number
  /** The shortcut ids the portal says it bound. */
  boundShortcuts?: string[]
} = {}) {
  const listeners: {
    match: { interface: string; member: string }
    listener: (signal: DBusSignal) => void
  }[] = []
  const calls: DBusCall[] = []

  function emit(signal: Omit<DBusSignal, "sender">) {
    for (const { match, listener } of listeners) {
      if (
        match.interface === signal.interface &&
        match.member === signal.member
      ) {
        listener({ sender: ":1.17", ...signal })
      }
    }
  }

  /** Answers a portal request on its request path, as the portal does. */
  function respond(
    options: Record<string, Variant>,
    code: number,
    results: Record<string, Variant>
  ) {
    const token = options.handle_token!.value as string
    const path = `${DESKTOP}/request/1_42/${token}`
    emit({
      path,
      interface: "org.freedesktop.portal.Request",
      member: "Response",
      body: [code, results],
    })
    return [path]
  }

  const bus: DBus = {
    uniqueName: async () => UNIQUE_NAME,
    async call(message) {
      calls.push(message)
      if (!portal || message.destination !== PORTAL) {
        throw new Error(
          `The name ${message.destination} was not provided by any .service files`
        )
      }
      const body = message.body ?? []
      switch (message.member) {
        case "Register":
          return []
        case "CreateSession":
          return respond(
            body[0] as Record<string, Variant>,
            createSessionResponse,
            { session_handle: new Variant("s", SESSION) }
          )
        case "BindShortcuts":
          return respond(body[3] as Record<string, Variant>, 0, {
            shortcuts: new Variant(
              "a(sa{sv})",
              boundShortcuts.map((id) => [
                id,
                { description: new Variant("s", "Push-to-talk") },
              ])
            ),
          })
        default:
          throw new Error(`Unknown method ${message.member}`)
      }
    },
    async onSignal(match, listener) {
      listeners.push({ match, listener })
    },
  }

  return {
    bus,
    calls,
    /** The Owner presses or lets go of a bound shortcut. */
    shortcut(
      member: "Activated" | "Deactivated",
      id: string,
      session = SESSION
    ) {
      emit({
        path: DESKTOP,
        interface: SHORTCUTS,
        member,
        body: [session, id, BigInt(1234), {}],
      })
    },
  }
}

/** The adapter over a fake bus, recording what it reported and logged. */
async function bindPushToTalk(bus: ReturnType<typeof fakeSessionBus>) {
  const events: string[] = []
  const logs = { info: [] as string[], warn: [] as string[] }
  const shortcuts = createPortalShortcuts({
    appId: "jarvis",
    connect: async () => bus.bus,
    log: {
      info: (message: string) => logs.info.push(message),
      warn: (message: string) => logs.warn.push(message),
    },
  })
  shortcuts.onPushToTalk({
    pressed: () => events.push("pressed"),
    released: () => events.push("released"),
  })
  await settle()
  return { events, logs }
}

describe("Push-to-talk through the desktop portal", () => {
  it("binds push-to-talk with SUPER+J as its preferred trigger", async () => {
    const bus = fakeSessionBus()
    await bindPushToTalk(bus)

    const register = bus.calls.find((call) => call.member === "Register")
    expect(register?.body?.[0]).toBe("jarvis")
    const bind = bus.calls.find((call) => call.member === "BindShortcuts")
    expect(bind?.body?.[0]).toBe(SESSION)
    expect(bind?.body?.[1]).toEqual([
      [
        PUSH_TO_TALK_ID,
        {
          description: new Variant("s", expect.any(String)),
          preferred_trigger: new Variant("s", "SUPER+J"),
        },
      ],
    ])
  })

  it("reports our shortcut's Activated and Deactivated as pressed and released", async () => {
    const bus = fakeSessionBus()
    const { events } = await bindPushToTalk(bus)

    bus.shortcut("Activated", PUSH_TO_TALK_ID)
    bus.shortcut("Deactivated", PUSH_TO_TALK_ID)

    expect(events).toEqual(["pressed", "released"])
  })

  it("ignores other shortcut ids and other sessions", async () => {
    const bus = fakeSessionBus()
    const { events } = await bindPushToTalk(bus)

    bus.shortcut("Activated", "screenshot")
    bus.shortcut("Deactivated", "screenshot")
    bus.shortcut("Activated", PUSH_TO_TALK_ID, `${DESKTOP}/session/1_7/other`)

    expect(events).toEqual([])
  })

  it("logs it and goes on when there is no desktop portal", async () => {
    const { events, logs } = await bindPushToTalk(
      fakeSessionBus({ portal: false })
    )

    expect(events).toEqual([])
    expect(logs.warn).toContainEqual(
      expect.stringContaining("Push-to-talk from any app is unavailable")
    )
  })

  it("logs it and goes on when the portal refuses the session", async () => {
    const bus = fakeSessionBus({ createSessionResponse: 2 })
    const { events, logs } = await bindPushToTalk(bus)

    bus.shortcut("Activated", PUSH_TO_TALK_ID)

    expect(events).toEqual([])
    expect(logs.warn).toEqual([
      expect.stringContaining("Push-to-talk from any app is unavailable"),
    ])
  })

  it("logs it when the portal doesn't bind our shortcut", async () => {
    const { logs } = await bindPushToTalk(
      fakeSessionBus({ boundShortcuts: [] })
    )

    expect(logs.warn).toEqual([
      expect.stringContaining("Push-to-talk from any app is unavailable"),
    ])
  })

  it("logs it and goes on when there is no session bus", async () => {
    const events: string[] = []
    const warnings: string[] = []
    createPortalShortcuts({
      appId: "jarvis",
      connect: async () => {
        throw new Error("DBUS_SESSION_BUS_ADDRESS is not set")
      },
      log: { info: () => {}, warn: (message) => warnings.push(message) },
    }).onPushToTalk({
      pressed: () => events.push("pressed"),
      released: () => events.push("released"),
    })
    await settle()

    expect(warnings).toEqual([
      expect.stringContaining("Push-to-talk from any app is unavailable"),
    ])
  })
})
