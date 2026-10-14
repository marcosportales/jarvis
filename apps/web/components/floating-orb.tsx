"use client"

import { useState, useSyncExternalStore } from "react"

import { Orb } from "@/components/orb"
import { createFloatingOrb } from "@/lib/jarvis/floating-orb"
import type { JarvisState } from "@/lib/jarvis/session"

/**
 * Its window is transparent, so only the Orb shows. Applies only while the
 * Floating Orb is on the page.
 */
const TRANSPARENT_PAGE = `
html:has([data-floating-orb]),
html:has([data-floating-orb]) body {
  background: transparent;
  overflow: hidden;
}
`

/**
 * The Floating Orb: the Orb alone, in the Jarvis App's small window above
 * every other app. It has no Session: it shows the Jarvis page's Jarvis
 * State and relays holds and clicks to the Jarvis App.
 */
export function FloatingOrb() {
  // Created on the client too, where the Jarvis App's API may be present.
  const [orb] = useState(() =>
    createFloatingOrb(
      typeof window === "undefined" ? undefined : window.jarvisApp
    )
  )
  const state = useSyncExternalStore(
    orb.subscribe,
    orb.getState,
    (): JarvisState => "idle"
  )

  return (
    <main
      data-floating-orb
      className="flex h-svh w-full items-center justify-center"
    >
      <style href="floating-orb" precedence="default">
        {TRANSPARENT_PAGE}
      </style>
      <Orb
        state={state}
        className="size-20"
        onPress={orb.pointerDown}
        onRelease={orb.pointerUp}
        onCancel={orb.pointerCancel}
      />
    </main>
  )
}
