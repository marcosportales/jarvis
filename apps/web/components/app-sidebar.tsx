"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"

import { SessionsList } from "@/components/sessions-list"
import { WidgetToggles } from "@/components/widget-toggles"
import { isCurrentPage, PAGES } from "@/lib/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 py-1 text-sm font-semibold">Jarvis</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {PAGES.map(({ href, label, icon: Icon }) => {
                const current = isCurrentPage(pathname, href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={current}
                      render={
                        <Link
                          href={href}
                          aria-current={current ? "page" : undefined}
                          // On mobile the sidebar is a drawer over the page; close it on arrival.
                          onClick={() => isMobile && setOpenMobile(false)}
                        />
                      }
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <WidgetToggles />
        <SessionsList />
      </SidebarContent>
    </Sidebar>
  )
}
