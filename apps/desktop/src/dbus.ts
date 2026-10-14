/**
 * The little of D-Bus the Jarvis App needs: call a method and hear signals.
 * The desktop portal adapter speaks only this, so it is tested over a fake
 * bus; `connectSessionBus` is the real one, over dbus-next.
 */

import { Message, MessageType, sessionBus } from "dbus-next"

export type DBusCall = {
  destination: string
  path: string
  interface: string
  member: string
  signature?: string
  body?: unknown[]
}

export type DBusSignal = {
  sender: string
  path: string
  interface: string
  member: string
  body: unknown[]
}

export type DBus = {
  /** This connection's unique name on the bus, e.g. `:1.42`. */
  uniqueName(): Promise<string>
  /** Calls a method; resolves to its reply's body, rejects on an error. */
  call(message: DBusCall): Promise<unknown[]>
  /** Hears every signal with this interface and member, from now on. */
  onSignal(
    match: { interface: string; member: string },
    listener: (signal: DBusSignal) => void
  ): Promise<void>
}

/** Connects to the Owner's session bus. Rejects if there is none. */
export async function connectSessionBus(): Promise<DBus> {
  const bus = sessionBus()
  // A bus that fails, now or later, must not crash the Jarvis App.
  bus.on("error", (error) => console.error("The session D-Bus failed", error))
  const name = new Promise<string>((resolve, reject) => {
    // dbus-next sets `name` once connected, but its types leave it out.
    bus.once("connect", () =>
      resolve((bus as unknown as { name: string }).name)
    )
    bus.once("error", reject)
  })
  await name

  async function call({ body, ...message }: DBusCall) {
    const reply = await bus.call(
      new Message({ ...message, ...(body ? { body } : {}) })
    )
    return reply?.body ?? []
  }

  return {
    uniqueName: () => name,
    call,
    async onSignal(match, listener) {
      await call({
        destination: "org.freedesktop.DBus",
        path: "/org/freedesktop/DBus",
        interface: "org.freedesktop.DBus",
        member: "AddMatch",
        signature: "s",
        body: [
          `type='signal',interface='${match.interface}',member='${match.member}'`,
        ],
      })
      bus.on("message", (message) => {
        if (
          message.type === MessageType.SIGNAL &&
          message.interface === match.interface &&
          message.member === match.member
        ) {
          listener({
            sender: message.sender,
            path: message.path,
            interface: message.interface,
            member: message.member,
            body: message.body,
          })
        }
      })
    },
  }
}
