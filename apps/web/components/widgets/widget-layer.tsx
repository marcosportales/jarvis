"use client"

import { XIcon } from "lucide-react"
import { useRef, type PointerEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

import { useWidgetLayout } from "@/hooks/use-widget-layout"
import type { WidgetPosition } from "@/lib/widgets/board"
import { getWidgetBoard } from "@/lib/widgets/browser-board"
import { WIDGETS, type WidgetDefinition } from "@/lib/widgets/registry"

/** Controls inside a Widget are pressed, never dragged from. */
const NOT_A_DRAG_HANDLE = "button, a, input, select, textarea"

/** Floats every Shown Widget over the Jarvis page at its place. */
export function WidgetLayer() {
  const { widgets } = useWidgetLayout()

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {widgets.map(({ id, shown, position }) => {
        const definition = WIDGETS.find((widget) => widget.id === id)
        if (!shown || !definition) return null
        return (
          <WidgetCard key={id} definition={definition} position={position} />
        )
      })}
    </div>
  )
}

/**
 * One Widget, draggable with a mouse or a finger from anywhere but its
 * controls. Pointer capture keeps the drag going when the pointer outruns it.
 */
function WidgetCard({
  definition: { id, name, component: Widget },
  position,
}: {
  definition: WidgetDefinition
  position: WidgetPosition
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
      className="pointer-events-auto absolute w-64 cursor-grab touch-none gap-2 select-none active:cursor-grabbing"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
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
      <div className="px-(--card-spacing)">
        <Widget />
      </div>
    </Card>
  )
}
