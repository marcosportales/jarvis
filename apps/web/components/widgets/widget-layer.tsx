"use client"

import { XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

import { useWidgetLayout } from "@/hooks/use-widget-layout"
import { getWidgetBoard } from "@/lib/widgets/browser-board"
import { WIDGETS } from "@/lib/widgets/registry"

/** Floats every Shown Widget over the Jarvis page at its place. */
export function WidgetLayer() {
  const { widgets } = useWidgetLayout()

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {widgets.map(({ id, shown, position }) => {
        const definition = WIDGETS.find((widget) => widget.id === id)
        if (!shown || !definition) return null
        const { name, component: Widget } = definition
        return (
          <Card
            key={id}
            size="sm"
            role="region"
            aria-label={name}
            className="pointer-events-auto absolute w-64 gap-2"
            style={{
              left: `${position.x * 100}%`,
              top: `${position.y * 100}%`,
            }}
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
      })}
    </div>
  )
}
