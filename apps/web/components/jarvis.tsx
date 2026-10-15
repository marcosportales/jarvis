"use client"

import { PencilIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Orb } from "@/components/orb"
import { SessionGone } from "@/components/session-gone"
import { useJarvisSession } from "@/hooks/use-jarvis-session"
import { useWidgetLayout } from "@/hooks/use-widget-layout"
import { isTypingTarget } from "@/lib/is-typing-target"
import { sessionPath } from "@/lib/navigation"
import { shownBrowse } from "@/lib/browse/browser-view"
import { shownJarvisState } from "@/lib/jarvis/browser-state"
import { shownTranscript } from "@/lib/jarvis/browser-transcript"
import { captionOf, type Caption } from "@/lib/jarvis/caption"
import { shownResults } from "@/lib/search/browser-results"
import type { JarvisState, SavedSession } from "@/lib/jarvis/session"
import { MEMORY_EVENT_LABELS } from "@/lib/memory/events"
import { getWidgetBoard } from "@/lib/widgets/browser-board"
import { TRANSCRIPT_WIDGET_ID } from "@/lib/widgets/catalog"

const STATE_LABELS: Record<JarvisState, string> = {
  idle: "Mantén pulsado para hablar",
  listening: "Escuchando…",
  thinking: "Pensando…",
  speaking: "Hablando…",
}

/** Shows the Transcript Widget, if Hidden, with its text box ready. */
function startTyping() {
  getWidgetBoard().show(TRANSCRIPT_WIDGET_ID)
  shownTranscript.requestTyping()
}

/** Enter or "/" on the page itself, not on a control or with a modifier. */
function asksToType(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== "/") return false
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return false
  }
  const target = event.target
  if (isTypingTarget(target)) return false
  return !(
    target instanceof Element &&
    target.closest("button, a, [role=button], [role=dialog]")
  )
}

/** The Jarvis page for a saved Session, or for a new one when none is given. */
export function Jarvis({ saved }: { saved?: SavedSession }) {
  // A new Session's URL becomes its Session URL without a navigation, so
  // coming back to "/" would keep it; start a new Session instead.
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = useState(pathname)
  const [newSessions, setNewSessions] = useState(0)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (pathname === "/") setNewSessions(newSessions + 1)
  }

  // Back to a Session URL set that way restores the "/" page, i.e. a new
  // Session under a saved Session's URL; load the saved Session instead.
  const router = useRouter()
  const [restoredUnderSessionUrl] = useState(() => !saved && pathname !== "/")
  useEffect(() => {
    if (restoredUnderSessionUrl) router.refresh()
  }, [restoredUnderSessionUrl, router])

  if (restoredUnderSessionUrl) return null
  return <JarvisSession key={newSessions} saved={saved} />
}

function JarvisSession({ saved }: { saved?: SavedSession }) {
  const {
    session,
    pushToTalk,
    state,
    transcript,
    hint,
    sessionId,
    gone,
    search,
    browse,
    browseJustEnded,
  } = useJarvisSession(saved)

  // The Results Widget lives outside this page, so hand it the latest Search.
  useEffect(() => shownResults.set(search), [search])

  // The Browser Widget too, with the Browse Task and its stop button.
  useEffect(
    () =>
      shownBrowse.set({
        view: browse,
        justEnded: browseJustEnded,
        stop: session.stopBrowse,
      }),
    [browse, browseJustEnded, session]
  )

  // An Expanded Widget covers the orb, so it shows the Jarvis State itself.
  useEffect(() => shownJarvisState.set(state), [state])

  // The Transcript Widget too, with the Transcript and the way to type.
  useEffect(
    () =>
      shownTranscript.set({
        entries: transcript,
        send: (text) => void session.sendTypedMessage(text),
      }),
    [transcript, session]
  )

  // Captions stand in for the Transcript Widget while it's Hidden. Before
  // the layout is read, neither shows, so neither flashes.
  const { widgets } = useWidgetLayout()
  const transcriptWidget = widgets.find(({ id }) => id === TRANSCRIPT_WIDGET_ID)
  const transcriptShown = transcriptWidget?.shown === true
  const caption =
    transcriptWidget && !transcriptShown ? captionOf(transcript, state) : null

  // Once the first Turn is saved, reloading should stay in this Session.
  // Replacing the URL doesn't remount the page, so Speaking carries on.
  useEffect(() => {
    if (sessionId && window.location.pathname !== sessionPath(sessionId)) {
      window.history.replaceState(null, "", sessionPath(sessionId))
    }
  }, [sessionId])

  // Holding Space is push-to-talk, except while typing in a text field;
  // Enter or "/" there opens the Transcript Widget to type.
  useEffect(() => {
    function claimsSpace(event: KeyboardEvent) {
      if (event.code !== "Space" || isTypingTarget(event.target)) return false
      event.preventDefault()
      return true
    }
    function onKeyDown(event: KeyboardEvent) {
      if (claimsSpace(event) && !event.repeat) pushToTalk.press("space")
      if (asksToType(event)) {
        event.preventDefault()
        startTyping()
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (claimsSpace(event)) pushToTalk.release("space")
    }
    // A keyup never arrives if the window loses focus mid-hold.
    function onBlur() {
      pushToTalk.windowBlurred()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [pushToTalk])

  if (gone) return <SessionGone />

  // The Orb in the middle; below it, while the Transcript Widget is Hidden,
  // the Caption as a subtitle and a way to start typing. On a phone a Shown
  // Transcript Widget is docked along the bottom, so the Orb sits above it.
  return (
    <div
      className={cn(
        "mx-auto grid h-svh w-full max-w-2xl grid-rows-[1fr_auto_1fr] justify-items-center p-4",
        transcriptShown && "max-sm:pb-[42svh]"
      )}
    >
      <div />
      <section className="flex flex-col items-center gap-2">
        <Orb
          state={state}
          className="size-64 max-sm:size-48"
          onPress={() => pushToTalk.press("orb")}
          onRelease={() => pushToTalk.release("orb")}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {STATE_LABELS[state]}
        </p>
        <p className="h-5 text-sm text-muted-foreground" aria-live="polite">
          {hint}
        </p>
      </section>
      {transcriptWidget && !transcriptShown && (
        <div className="flex w-full flex-col items-center justify-end gap-3 pb-4">
          {caption && <CaptionStrip caption={caption} />}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Escribir"
            title="Escribir (Enter)"
            className="cursor-pointer rounded-full"
            onClick={startTyping}
          >
            <PencilIcon />
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * The Caption, like a film subtitle. The Reply is already spoken aloud, so
 * only an error is announced; long Replies are cut short.
 */
function CaptionStrip({ caption }: { caption: Caption }) {
  return (
    <div className="max-w-full rounded-lg bg-black/70 px-4 py-2 text-center text-white">
      {caption.kind === "welcome" ? (
        <p>
          Hola, soy Jarvis. Mantén pulsado el orbe o la barra espaciadora para
          hablar, o pulsa Enter para escribir.
        </p>
      ) : (
        <>
          {caption.owner && (
            <p className="text-xs opacity-70">Tú: {caption.owner}</p>
          )}
          {caption.reply && <p className="line-clamp-4">{caption.reply}</p>}
          {caption.memoryEvents?.map(({ kind, title }, index) => (
            <p key={index} className="text-xs opacity-70">
              {MEMORY_EVENT_LABELS[kind]}: {title}
            </p>
          ))}
          {caption.error && (
            <p role="alert" className="text-sm text-red-300">
              {caption.error}
            </p>
          )}
        </>
      )}
    </div>
  )
}
