"use client"

import { Maximize2Icon, Minimize2Icon, XIcon } from "lucide-react"
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type MouseEvent,
  type PointerEvent,
} from "react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import { useWidgetLayout } from "@/hooks/use-widget-layout"
import { shownJarvisState } from "@/lib/jarvis/browser-state"
import type { JarvisState } from "@/lib/jarvis/session"
import type { WidgetState } from "@/lib/widgets/board"
import { getWidgetBoard, WIDGET_SIZE } from "@/lib/widgets/browser-board"
import { WIDGETS, type WidgetDefinition } from "@/lib/widgets/registry"

/** Controls inside a Widget are pressed, and its scrolling body scrolled. */
const NOT_A_DRAG_HANDLE = "button, a, input, select, textarea, [data-scrolls]"

/**
 * Floats every Shown Widget over the Jarvis page at its place, and the
 * Expanded one, if any, large in the middle over a dimmed backdrop. Not a
 * modal: the page stays live, so push-to-talk keeps working.
 */
export function WidgetLayer() {
  const { widgets, expanded } = useWidgetLayout()

  // Esc collapses the Expanded Widget, wherever the focus is.
  useEffect(() => {
    if (!expanded) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.preventDefault()
      getWidgetBoard().collapse()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [expanded])

  return (
    // Above the sidebar trigger while a Widget is Expanded, so it's covered too.
    <div
      className={cn(
        "pointer-events-none fixed inset-0",
        expanded ? "z-40" : "z-20"
      )}
    >
      {expanded && (
        <div
          aria-hidden
          className="pointer-events-auto absolute inset-0 z-10 bg-black/50 motion-safe:animate-in motion-safe:fade-in"
          onClick={() => getWidgetBoard().collapse()}
        />
      )}
      {widgets.map((state) => {
        const definition = WIDGETS.find((widget) => widget.id === state.id)
        if (!state.shown || !definition) return null
        return (
          <WidgetCard
            key={state.id}
            definition={definition}
            state={state}
            expanded={state.id === expanded}
          />
        )
      })}
    </div>
  )
}

/**
 * One Widget. Collapsed, it's a card at its place, draggable with a mouse or
 * a finger from anywhere but its controls; pointer capture keeps the drag
 * going when the pointer outruns it. A move to a Spot glides there, unless
 * the Owner prefers reduced motion. A Widget with its own size keeps it and
 * scrolls inside, dragged by its header. Expanded, the same element becomes a
 * centred frame, so the Widget inside stays mounted and keeps its state.
 */
function WidgetCard({
  definition: { id, name, size, expandable, component: Widget },
  state: { position, glide, settings },
  expanded,
}: {
  definition: WidgetDefinition
  state: WidgetState
  expanded: boolean
}) {
  /** Where the pointer grabbed the card, from its top-left corner. */
  const grab = useRef<{ pointerId: number; x: number; y: number } | null>(null)

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (expanded || !event.isPrimary || event.button !== 0) return
    if ((event.target as Element).closest(NOT_A_DRAG_HANDLE)) return
    const card = event.currentTarget.getBoundingClientRect()
    grab.current = {
      pointerId: event.pointerId,
      x: event.clientX - card.left,
      y: event.clientY - card.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (grab.current?.pointerId !== event.pointerId) return
    getWidgetBoard().drag(id, {
      left: event.clientX - grab.current.x,
      top: event.clientY - grab.current.y,
    })
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (grab.current?.pointerId === event.pointerId) grab.current = null
  }

  const header = useRef<HTMLDivElement>(null)

  /**
   * A double-click on the header, not on its buttons, expands it. Heard on
   * the card, as pointer capture sends the clicks there.
   */
  function expandFromHeader(event: MouseEvent<HTMLDivElement>) {
    if (expanded || !expandable || !header.current) return
    if ((event.target as Element).closest(NOT_A_DRAG_HANDLE)) return
    const { top, bottom } = header.current.getBoundingClientRect()
    if (event.clientY < top || event.clientY > bottom) return
    getWidgetBoard().expand(id)
  }

  const scrolls = expanded || size !== undefined

  return (
    <Card
      size="sm"
      role="region"
      aria-label={name}
      className={cn(
        "pointer-events-auto gap-2",
        expanded
          ? // Centred; the whole screen on a phone.
            "fixed inset-0 z-20 m-auto h-[85vh] w-[90vw] shadow-2xl max-sm:h-svh max-sm:w-full max-sm:rounded-none"
          : "absolute cursor-grab touch-none select-none active:cursor-grabbing",
        !expanded &&
          glide &&
          "motion-safe:transition-[left,top] motion-safe:duration-500 motion-safe:ease-out"
      )}
      style={
        expanded
          ? undefined
          : {
              left: `${position.x * 100}%`,
              top: `${position.y * 100}%`,
              width: (size ?? WIDGET_SIZE).width,
              ...(size ? { height: size.height } : {}),
            }
      }
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={expandFromHeader}
    >
      <div
        ref={header}
        className="flex items-center justify-between gap-2 px-(--card-spacing)"
      >
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="truncate">{name}</span>
          {expanded && <JarvisStateDot />}
        </span>
        <span className="flex items-center gap-1">
          {expanded ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Reducir ${name}`}
              title="Reducir (Esc)"
              className="cursor-pointer"
              onClick={() => getWidgetBoard().collapse()}
            >
              <Minimize2Icon />
            </Button>
          ) : (
            <>
              {expandable && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Ampliar ${name}`}
                  title="Ampliar"
                  className="cursor-pointer"
                  onClick={() => getWidgetBoard().expand(id)}
                >
                  <Maximize2Icon />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Cerrar ${name}`}
                title="Cerrar"
                className="cursor-pointer"
                onClick={() => getWidgetBoard().hide(id)}
              >
                <XIcon />
              </Button>
            </>
          )}
        </span>
      </div>
      <div
        className={cn(
          "px-(--card-spacing)",
          scrolls && "min-h-0 flex-1 touch-pan-y overflow-y-auto select-text"
        )}
        data-scrolls={scrolls ? "" : undefined}
      >
        <Widget
          settings={settings}
          updateSettings={(next) => getWidgetBoard().updateSettings(id, next)}
          expanded={expanded}
        />
      </div>
    </Card>
  )
}

const STATE_DOTS: Record<JarvisState, { label: string; className: string }> = {
  idle: { label: "En espera", className: "bg-muted-foreground/40" },
  listening: {
    label: "Escuchando",
    className: "bg-red-500 motion-safe:animate-pulse",
  },
  thinking: {
    label: "Pensando",
    className: "bg-amber-500 motion-safe:animate-pulse",
  },
  speaking: { label: "Hablando", className: "bg-emerald-500" },
}

/** The orb is covered, so the Expanded header says what Jarvis is doing. */
function JarvisStateDot() {
  const state = useSyncExternalStore(
    shownJarvisState.subscribe,
    shownJarvisState.get,
    shownJarvisState.get
  )
  const { label, className } = STATE_DOTS[state]
  return (
    <span
      role="status"
      aria-label={`Jarvis: ${label}`}
      title={`Jarvis: ${label}`}
      data-state={state}
      className={cn("size-2 shrink-0 rounded-full", className)}
    />
  )
}
