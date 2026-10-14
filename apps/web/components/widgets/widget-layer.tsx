"use client"

import { XIcon } from "lucide-react"
import { useRef, type PointerEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import { useWidgetLayout } from "@/hooks/use-widget-layout"
import type { WidgetState } from "@/lib/widgets/board"
import { getWidgetBoard, WIDGET_SIZE } from "@/lib/widgets/browser-board"
import { WIDGETS, type WidgetDefinition } from "@/lib/widgets/registry"

/** Controls inside a Widget are pressed, and its scrolling body scrolled. */
const NOT_A_DRAG_HANDLE = "button, a, input, select, textarea, [data-scrolls]"

/** Floats every Shown Widget over the Jarvis page at its place. */
export function WidgetLayer() {
  const { widgets } = useWidgetLayout()

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {widgets.map((state) => {
        const definition = WIDGETS.find((widget) => widget.id === state.id)
        if (!state.shown || !definition) return null
        return (
          <WidgetCard key={state.id} definition={definition} state={state} />
        )
      })}
    </div>
  )
}

/**
 * One Widget, draggable with a mouse or a finger from anywhere but its
 * controls. Pointer capture keeps the drag going when the pointer outruns it.
 * A move to a Spot glides there, unless the Owner prefers reduced motion. A
 * Widget with its own size keeps it and scrolls inside, dragged by its header.
 */
function WidgetCard({
  definition: { id, name, size, component: Widget },
  state: { position, glide, settings },
}: {
  definition: WidgetDefinition
  state: WidgetState
}) {
  /** Where the pointer grabbed the card, from its top-left corner. */
  const grab = useRef<{ pointerId: number; x: number; y: number } | null>(null)

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
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

  return (
    <Card
      size="sm"
      role="region"
      aria-label={name}
      className={cn(
        "pointer-events-auto absolute cursor-grab touch-none gap-2 select-none active:cursor-grabbing",
        glide &&
          "motion-safe:transition-[left,top] motion-safe:duration-500 motion-safe:ease-out"
      )}
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        width: (size ?? WIDGET_SIZE).width,
        ...(size ? { height: size.height } : {}),
      }}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="flex items-center justify-between px-(--card-spacing)">
        <span className="text-xs font-medium text-muted-foreground">
          {name}
        </span>
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
      </div>
      <div
        className={cn(
          "px-(--card-spacing)",
          size && "min-h-0 flex-1 touch-pan-y overflow-y-auto select-text"
        )}
        data-scrolls={size ? "" : undefined}
      >
        <Widget
          settings={settings}
          updateSettings={(next) => getWidgetBoard().updateSettings(id, next)}
        />
      </div>
    </Card>
  )
}
