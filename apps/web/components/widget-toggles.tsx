"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { Switch } from "@workspace/ui/components/switch"

import { useWidgetLayout } from "@/hooks/use-widget-layout"
import { getWidgetBoard } from "@/lib/widgets/browser-board"
import { WIDGETS } from "@/lib/widgets/registry"

/** A switch per registry Widget, bound to the tab's Widget Board. */
export function WidgetToggles() {
  const { widgets } = useWidgetLayout()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Widgets</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {WIDGETS.map(({ id, name }) => {
            // Absent until hydration, when the saved layout is unknown.
            const state = widgets.find((widget) => widget.id === id)
            return (
              <SidebarMenuItem key={id}>
                <label className="flex h-8 items-center justify-between gap-2 rounded-md px-2 text-sm">
                  <span>{name}</span>
                  <Switch
                    checked={state?.shown ?? false}
                    disabled={!state}
                    onCheckedChange={(checked) =>
                      checked
                        ? getWidgetBoard().show(id)
                        : getWidgetBoard().hide(id)
                    }
                  />
                </label>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
