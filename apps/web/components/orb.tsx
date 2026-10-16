"use client"

import { PlusIcon, SquareIcon } from "lucide-react"

import { Persona } from "@workspace/ui/components/ai-elements/persona"
import { cn } from "@workspace/ui/lib/utils"

import type { JarvisState } from "@/lib/jarvis/session"

/**
 * The Orb: the round button the Owner taps to turn Hands-free on or off, or
 * holds for Push-to-talk, showing the Jarvis State and whether the mic is
 * open. The Jarvis page and the Floating Orb both use it; each decides what
 * pressing and releasing it means.
 *
 * The mic-open look is a placeholder ring, steady while Jarvis is busy and
 * breathing while Idle with Hands-free on, so "waiting for you" looks
 * different from "not listening". Where a tap stops the Reply, Speaking
 * shows a placeholder stop badge, and Thinking with something queued a
 * placeholder plus badge. The look-and-sounds ticket replaces them.
 */
export function Orb({
  state,
  micOpen = false,
  handsFree = false,
  tapStopsReply = false,
  queued = false,
  label = "Mantén pulsado para hablar con Jarvis",
  className,
  onPress,
  onRelease,
  onCancel = onRelease,
}: {
  state: JarvisState
  /** The mic is open: Hands-free is on or a hold is going on. */
  micOpen?: boolean
  /** Hands-free is on, so the button shows as pressed. */
  handsFree?: boolean
  /** A tap while Speaking stops the Reply, so Speaking shows it. */
  tapStopsReply?: boolean
  /** What the Owner added while Thinking is queued as the next Turn. */
  queued?: boolean
  /** What the button does, for assistive technology. */
  label?: string
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
      aria-label={label}
      aria-pressed={handsFree || state === "listening"}
      data-mic-open={micOpen}
      className={cn(
        "relative touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring",
        micOpen &&
          "ring-4 ring-emerald-500/70 ring-offset-4 ring-offset-background",
        micOpen && state === "idle" && "animate-pulse"
      )}
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
      {tapStopsReply && state === "speaking" && (
        <span
          aria-hidden
          className="absolute right-[12%] bottom-[12%] flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border"
        >
          <SquareIcon className="size-4 fill-current" />
        </span>
      )}
      {queued && state === "thinking" && (
        <span
          aria-hidden
          data-queued
          className="absolute right-[12%] bottom-[12%] flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border"
        >
          <PlusIcon className="size-5" />
        </span>
      )}
    </button>
  )
}
