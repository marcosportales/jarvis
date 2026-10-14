"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@workspace/ui/components/sidebar"

import { deleteSession, listSessions } from "@/app/(jarvis)/sessions/actions"
import { sessionPath } from "@/lib/navigation"
import {
  notifySessionsChanged,
  onSessionsChanged,
} from "@/lib/sessions/browser-events"
import { relativeDate, sessionHeading } from "@/lib/sessions/headings"
import type { SessionListPage, SessionSummary } from "@/lib/sessions/store"

/** The "Sesiones" group: every saved Session, newest activity first. */
export function SessionsList() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  // The Session waiting for the Owner to confirm its deletion.
  const [toDelete, setToDelete] = useState<SessionSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Null until the first page arrives.
  const [list, setList] = useState<SessionListPage | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const end = useRef<HTMLLIElement>(null)

  const loadFirstPage = useCallback(async () => {
    try {
      setList(await listSessions())
    } catch (error) {
      // Keeps what is shown; the next change retries.
      console.error("Loading the Sessions failed", error)
      setList((current) => current ?? { sessions: [], nextCursor: null })
    }
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
      try {
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
      } catch (error) {
        console.error("Loading more Sessions failed", error)
      } finally {
        // Also re-arms the observer, so scrolling again retries.
        setLoadingMore(false)
      }
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [cursor, loadingMore])

  async function confirmDelete(session: SessionSummary) {
    setDeleting(true)
    try {
      await deleteSession(session.id)
    } catch (error) {
      // The dialog stays open so the Owner can try again or cancel.
      console.error("Deleting the Session failed", error)
      return
    } finally {
      setDeleting(false)
    }
    setToDelete(null)
    setList(
      (current) =>
        current && {
          ...current,
          sessions: current.sessions.filter(({ id }) => id !== session.id),
        }
    )
    notifySessionsChanged()
    // Never leave the Owner on a deleted Session.
    if (pathname === sessionPath(session.id)) router.push("/")
  }

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
                    {sessionHeading(session)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeDate(session.lastActivityAt, now)}
                  </span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<SidebarMenuAction showOnHover />}
                  >
                    <MoreHorizontalIcon />
                    <span className="sr-only">
                      Más opciones de {sessionHeading(session)}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setToDelete(session)}
                    >
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && !deleting && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              «{toDelete && sessionHeading(toDelete)}» y toda su conversación se
              borrarán para siempre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => toDelete && void confirmDelete(toDelete)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  )
}
