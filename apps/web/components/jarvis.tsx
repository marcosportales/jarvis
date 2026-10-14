"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
} from "@workspace/ui/components/ai-elements/message"
import { Persona } from "@workspace/ui/components/ai-elements/persona"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input"

import { SessionGone } from "@/components/session-gone"
import { useJarvisSession } from "@/hooks/use-jarvis-session"
import { isTypingTarget } from "@/lib/is-typing-target"
import { sessionPath } from "@/lib/navigation"
import type { JarvisState, SavedSession } from "@/lib/jarvis/session"

const STATE_LABELS: Record<JarvisState, string> = {
  idle: "Mantén pulsado para hablar",
  listening: "Escuchando…",
  thinking: "Pensando…",
  speaking: "Hablando…",
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
  const { session, state, transcript, hint, sessionId, gone } =
    useJarvisSession(saved)

  // Once the first Turn is saved, reloading should stay in this Session.
  // Replacing the URL doesn't remount the page, so Speaking carries on.
  useEffect(() => {
    if (sessionId && window.location.pathname !== sessionPath(sessionId)) {
      window.history.replaceState(null, "", sessionPath(sessionId))
    }
  }, [sessionId])

  // Holding Space is push-to-talk, except while typing in a text field.
  useEffect(() => {
    function claimsSpace(event: KeyboardEvent) {
      if (event.code !== "Space" || isTypingTarget(event.target)) return false
      event.preventDefault()
      return true
    }
    function onKeyDown(event: KeyboardEvent) {
      if (claimsSpace(event) && !event.repeat) session.pressPushToTalk()
    }
    function onKeyUp(event: KeyboardEvent) {
      if (claimsSpace(event)) void session.releasePushToTalk()
    }
    // A keyup never arrives if the window loses focus mid-hold.
    function onBlur() {
      void session.releasePushToTalk()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [session])

  const busy = state === "listening" || state === "thinking"

  if (gone) return <SessionGone />

  return (
    <div className="mx-auto flex h-svh w-full max-w-2xl flex-col gap-4 p-4">
      <section className="flex flex-col items-center gap-2 pt-6">
        <button
          type="button"
          aria-label="Mantén pulsado para hablar con Jarvis"
          aria-pressed={state === "listening"}
          className="touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.currentTarget.setPointerCapture(event.pointerId)
            session.pressPushToTalk()
          }}
          onPointerUp={() => void session.releasePushToTalk()}
          onPointerCancel={() => void session.releasePushToTalk()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <Persona className="size-48" state={state} variant="obsidian" />
        </button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {STATE_LABELS[state]}
        </p>
        <p className="h-5 text-sm text-muted-foreground" aria-live="polite">
          {hint}
        </p>
      </section>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {transcript.length === 0 ? (
            <ConversationEmptyState
              title="Hola, soy Jarvis"
              description="Mantén pulsado el orbe o la barra espaciadora para hablar, o escribe abajo."
            />
          ) : (
            transcript.map((entry) =>
              entry.role === "error" ? (
                <p
                  key={entry.id}
                  role="alert"
                  className="text-center text-sm text-destructive"
                >
                  {entry.text}
                </p>
              ) : (
                <Message
                  key={entry.id}
                  from={entry.role === "owner" ? "user" : "assistant"}
                >
                  <MessageContent>{entry.text}</MessageContent>
                </Message>
              )
            )
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={({ text }) => {
          if (text.trim()) void session.sendTypedMessage(text.trim())
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder="Escribe a Jarvis…" />
        </PromptInputBody>
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit
            disabled={busy}
            status={state === "thinking" ? "submitted" : undefined}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
