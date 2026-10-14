/**
 * The Shortcuts port over the XDG desktop portal's Global Shortcuts, on the
 * session D-Bus. Unlike Electron's own global shortcuts it reports a key
 * going up as well as down, which holding Push-to-talk needs.
 *
 * The flow: register Jarvis's app id, CreateSession, then BindShortcuts for
 * `push-to-talk`; each request is answered by a Response signal on its own
 * request path. After that the portal's Activated and Deactivated signals
 * for our session and id are the key going down and up. The compositor
 * decides the actual key: on Hyprland the Owner binds it to
 * `<app id>:push-to-talk` (see the README).
 */

import { Variant } from "dbus-next"

import type { DBus } from "./dbus.js"
import type { Shortcuts } from "./ports.js"

export const PUSH_TO_TALK_ID = "push-to-talk"
const PREFERRED_TRIGGER = "SUPER+J"

const PORTAL = "org.freedesktop.portal.Desktop"
const DESKTOP = "/org/freedesktop/portal/desktop"
const GLOBAL_SHORTCUTS = "org.freedesktop.portal.GlobalShortcuts"
const REQUEST = "org.freedesktop.portal.Request"
const REGISTRY = "org.freedesktop.host.portal.Registry"

export type PortalLog = {
  info(message: string): void
  warn(message: string, error?: unknown): void
}

type Results = Record<string, Variant | undefined>

export function createPortalShortcuts({
  appId,
  connect,
  log,
}: {
  /**
   * Who the portal thinks Jarvis is. It must name an installed
   * `<appId>.desktop` file, or the portal refuses to register it.
   */
  appId: string
  connect: () => Promise<DBus>
  log: PortalLog
}): Shortcuts {
  async function bind(listeners: { pressed(): void; released(): void }) {
    const bus = await connect()
    // Request paths are built from our unique name: `:1.42` → `1_42`.
    const sender = (await bus.uniqueName()).slice(1).replaceAll(".", "_")
    // Signals carry their sender's unique name, never the portal's
    // well-known one, so only signals from that name's owner are the portal.
    const [portal] = (await bus.call({
      destination: "org.freedesktop.DBus",
      path: "/org/freedesktop/DBus",
      interface: "org.freedesktop.DBus",
      member: "GetNameOwner",
      signature: "s",
      body: [PORTAL],
    })) as [string]
    let session: string | undefined
    let tokens = 0

    // Every app's portal Responses reach us; only those on the paths of our
    // own requests in flight are heard, and only from the portal.
    const waiting = new Map<string, (response: [number, Results]) => void>()
    await bus.onSignal({ interface: REQUEST, member: "Response" }, (signal) => {
      const claim = waiting.get(signal.path)
      if (!claim || signal.sender !== portal) return
      waiting.delete(signal.path)
      claim(signal.body as [number, Results])
    })
    function responseOn(path: string) {
      return new Promise<[number, Results]>((resolve) =>
        waiting.set(path, resolve)
      )
    }

    /** Asks the portal for something, then waits for its Response. */
    async function request(
      member: string,
      signature: string,
      body: (options: { handle_token: Variant<string> }) => unknown[]
    ) {
      const token = `jarvis${++tokens}_${Math.random().toString(36).slice(2)}`
      // The portal answers on a path known in advance, possibly before the
      // call returns, so the wait starts first.
      const expected = `${DESKTOP}/request/${sender}/${token}`
      let response = responseOn(expected)
      const [handle] = (await bus.call({
        destination: PORTAL,
        path: DESKTOP,
        interface: GLOBAL_SHORTCUTS,
        member,
        signature,
        body: body({ handle_token: new Variant("s", token) }),
      })) as [string]
      if (handle !== expected) {
        // An older portal, which picks its own request path.
        waiting.delete(expected)
        response = responseOn(handle)
      }
      const [code, results] = await response
      if (code !== 0) {
        throw new Error(
          `${member} was ${code === 1 ? "cancelled" : "refused"} by the portal`
        )
      }
      return results
    }

    for (const [member, report] of [
      ["Activated", listeners.pressed],
      ["Deactivated", listeners.released],
    ] as const) {
      await bus.onSignal({ interface: GLOBAL_SHORTCUTS, member }, (signal) => {
        const [from, id] = signal.body as [string, string]
        if (
          session !== undefined &&
          signal.sender === portal &&
          from === session &&
          id === PUSH_TO_TALK_ID
        ) {
          report()
        }
      })
    }

    try {
      await bus.call({
        destination: PORTAL,
        path: DESKTOP,
        interface: REGISTRY,
        member: "Register",
        signature: "sa{sv}",
        body: [appId, {}],
      })
    } catch (error) {
      // Older portals have no registry; they may know Jarvis some other way.
      log.warn(`The desktop portal didn't register the app id ${appId}`, error)
    }

    const created = await request("CreateSession", "a{sv}", (options) => [
      {
        ...options,
        session_handle_token: new Variant("s", `jarvis_${sender}`),
      },
    ])
    const handle = created.session_handle?.value
    if (typeof handle !== "string") {
      throw new Error("The portal opened no Global Shortcuts session")
    }

    const bound = await request(
      "BindShortcuts",
      "oa(sa{sv})sa{sv}",
      (options) => [
        handle,
        [
          [
            PUSH_TO_TALK_ID,
            {
              description: new Variant("s", "Push-to-talk de Jarvis"),
              preferred_trigger: new Variant("s", PREFERRED_TRIGGER),
            },
          ],
        ],
        "",
        options,
      ]
    )
    const ids = ((bound.shortcuts?.value ?? []) as [string, unknown][]).map(
      ([id]) => id
    )
    if (!ids.includes(PUSH_TO_TALK_ID)) {
      throw new Error(`The portal didn't bind ${PUSH_TO_TALK_ID}`)
    }
    session = handle
    log.info(
      `Push-to-talk from any app is bound to ${appId}:${PUSH_TO_TALK_ID}`
    )
  }

  return {
    onPushToTalk(listeners) {
      bind(listeners).catch((error: unknown) =>
        log.warn(
          `Push-to-talk from any app is unavailable: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      )
    },
  }
}
