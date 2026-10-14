"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@workspace/ui/components/sidebar"

import { listSessions } from "@/app/sessions/actions"
import { sessionPath } from "@/lib/navigation"
import { onSessionsChanged } from "@/lib/sessions/browser-events"
import { relativeDate, sessionLabel } from "@/lib/sessions/labels"
import type { SessionPage } from "@/lib/sessions/store"

/** The "Sesiones" group: every saved Session, newest activity first. */
export function SessionsList() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  // Null until the first page arrives.
  const [list, setList] = useState<SessionPage | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const end = useRef<HTMLLIElement>(null)

  const loadFirstPage = useCallback(async () => {
    setList(await listSessions())
  }, [])

  useEffect(() => {
    void loadFirstPage()
    return onSessionsChanged(() => void loadFirstPage())
  }, [loadFirstPage])

  // Loads the next page when the end of the list comes into view.
  const cursor = list?.nextCursor
  useEffect(() => {
    const target = end.current
    if (!cursor || !target || loadingMore) return
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      setLoadingMore(true)
      const next = await listSessions(cursor)
      setList((current) =>
        // A refresh replaced the list meanwhile; this page no longer follows.
        current?.nextCursor === cursor
          ? {
              sessions: [...current.sessions, ...next.sessions],
              nextCursor: next.nextCursor,
            }
          : current
      )
      setLoadingMore(false)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [cursor, loadingMore])

  const now = new Date()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Sesiones</SidebarGroupLabel>
      <SidebarGroupAction
        title="Nueva sesión"
        render={
          <Link href="/" onClick={() => isMobile && setOpenMobile(false)} />
        }
      >
        <PlusIcon />
        <span className="sr-only">Nueva sesión</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {list === null &&
            Array.from({ length: 3 }, (_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            ))}
          {list?.sessions.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Aún no hay sesiones.
            </p>
          )}
          {list?.sessions.map((session) => {
            const href = sessionPath(session.id)
            const current = pathname === href
            return (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  isActive={current}
                  className="h-auto flex-col items-start gap-0"
                  render={
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      onClick={(event) => {
                        // Already open: navigating would reload it mid-Turn.
                        if (current) event.preventDefault()
                        if (isMobile) setOpenMobile(false)
                      }}
                    />
                  }
                >
                  <span className="w-full truncate">
                    {sessionLabel(session)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeDate(session.lastActivityAt, now)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
          {list?.nextCursor && (
            <SidebarMenuItem ref={end}>
              <SidebarMenuSkeleton />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
