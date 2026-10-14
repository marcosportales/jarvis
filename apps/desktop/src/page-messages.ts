/**
 * What Jarvis's pages send the Jarvis App over IPC, checked before the App
 * controller sees it: a page is web content, so anything may arrive.
 */

import type { FloatingOrbGesture, JarvisState } from "./ports.js"

const JARVIS_STATES: readonly unknown[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
] satisfies JarvisState[]

const FLOATING_ORB_GESTURES: readonly unknown[] = [
  "press",
  "release",
  "click",
] satisfies FloatingOrbGesture[]

/** The Jarvis State the Jarvis page published, if it is one. */
export function parseJarvisState(value: unknown): JarvisState | undefined {
  return JARVIS_STATES.includes(value) ? (value as JarvisState) : undefined
}

/** The gesture the Floating Orb page sent, if it is one. */
export function parseFloatingOrbGesture(
  value: unknown
): FloatingOrbGesture | undefined {
  return FLOATING_ORB_GESTURES.includes(value)
    ? (value as FloatingOrbGesture)
    : undefined
}
