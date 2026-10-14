/** A page asking for a permission, as Electron describes it. */
export type PermissionAsk = {
  permission: string
  /** The asking page's URL or origin. */
  url: string
  /** For `media`: what it wants to capture, when Electron says. */
  mediaTypes?: readonly ("audio" | "video")[]
}

/**
 * Whether the Jarvis App grants a permission without asking the Owner: only
 * the microphone, and only to Jarvis's own pages, so Push-to-talk works from
 * the first hold. Everything else is refused, as an unanswered browser
 * prompt would be (e.g. the Owner's location falls back to a default city).
 */
export function grantsPermission(jarvisOrigin: string, ask: PermissionAsk) {
  if (ask.permission !== "media") return false
  if (ask.mediaTypes?.some((type) => type !== "audio")) return false
  try {
    return new URL(ask.url).origin === new URL(jarvisOrigin).origin
  } catch {
    return false
  }
}
