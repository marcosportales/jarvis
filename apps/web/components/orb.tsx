"use client"

import { Persona } from "@workspace/ui/components/ai-elements/persona"
import { cn } from "@workspace/ui/lib/utils"

import type { JarvisState } from "@/lib/jarvis/session"

/**
 * The Orb: the round button the Owner holds for Push-to-talk, showing the
 * Jarvis State. The Jarvis page and the Floating Orb both use it; each
 * decides what pressing and releasing it means.
 */
export function Orb({
  state,
  className,
  onPress,
  onRelease,
  onCancel = onRelease,
}: {
  state: JarvisState
  /** The Orb's size, e.g. `size-48`. */
  className?: string
  /** The main button went down on it. */
  onPress: () => void
  /** That button came back up, wherever the pointer is by then. */
  onRelease: () => void
  /** The pointer was lost mid-press; a release by default. */
  onCancel?: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Mantén pulsado para hablar con Jarvis"
      aria-pressed={state === "listening"}
      className="touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerCancel={onCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Persona
        className={cn("size-48", className)}
        state={state}
        variant="obsidian"
      />
    </button>
  )
}
