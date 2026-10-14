/**
 * What Jarvis's pages send the Jarvis App over IPC, checked before the App
 * controller sees it: a page is web content, so anything may arrive.
 */

import {
  FLOATING_ORB_GESTURES,
  JARVIS_STATES,
  type FloatingOrbGesture,
  type JarvisState,
} from "./page-api.js"

/** The Jarvis State the Jarvis page published, if it is one. */
export function parseJarvisState(value: unknown): JarvisState | undefined {
  return (JARVIS_STATES as readonly unknown[]).includes(value)
    ? (value as JarvisState)
    : undefined
}

/** The gesture the Floating Orb page sent, if it is one. */
export function parseFloatingOrbGesture(
  value: unknown
): FloatingOrbGesture | undefined {
  return (FLOATING_ORB_GESTURES as readonly unknown[]).includes(value)
    ? (value as FloatingOrbGesture)
    : undefined
}
