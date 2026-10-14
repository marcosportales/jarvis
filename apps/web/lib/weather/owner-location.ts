import type { Coordinates } from "./weather"

/** A fix this old is still good enough for the weather. */
const MAX_AGE_MS = 15 * 60 * 1000

/** An unanswered prompt counts as denied, so the Widget isn't stuck loading. */
const ANSWER_TIMEOUT_MS = 15 * 1000

let ownerCoords: Promise<Coordinates | undefined> | undefined

/**
 * The Owner's location, asked for once per Session. Denied or unavailable
 * means none, so the server uses its fallback city.
 */
export function locateOwner() {
  ownerCoords ??= new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(undefined)
    setTimeout(() => resolve(undefined), ANSWER_TIMEOUT_MS)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(undefined),
      { maximumAge: MAX_AGE_MS }
    )
  })
  return ownerCoords
}

/**
 * The Owner's location only if the browser already has permission, so a Turn
 * never prompts for it.
 */
export async function ownerLocationIfGranted(): Promise<
  Coordinates | undefined
> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" })
    if (status.state !== "granted") return undefined
    return await locateOwner()
  } catch {
    return undefined
  }
}
