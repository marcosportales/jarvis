"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"

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
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input"

import { shownJarvisState } from "@/lib/jarvis/browser-state"
import { shownTranscript } from "@/lib/jarvis/browser-transcript"
import { MEMORY_EVENT_LABELS } from "@/lib/memory/events"

/** Every Turn of the open Session, and the box where the Owner types one. */
export function TranscriptWidget() {
  const { entries, send, typingRequested } = useSyncExternalStore(
    shownTranscript.subscribe,
    shownTranscript.get,
    shownTranscript.get
  )
  const state = useSyncExternalStore(
    shownJarvisState.subscribe,
    shownJarvisState.get,
    shownJarvisState.get
  )
  const busy = state === "listening" || state === "thinking"

  // The Owner asked to type, maybe just Showing this Widget to do it. Only
  // then: a focused text box would take Space from push-to-talk.
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!typingRequested) return
    box.current?.querySelector("textarea")?.focus()
    shownTranscript.typingHandled()
  }, [typingRequested])

  return (
    <div className="flex h-full flex-col gap-2">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="p-0 py-2">
          {entries.length === 0 ? (
            <ConversationEmptyState
              title="Hola, soy Jarvis"
              description="Habla con el orbe, o escribe abajo."
            />
          ) : (
            entries.map((entry) =>
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
                  {entry.memoryEvents?.map(({ kind, title }, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {MEMORY_EVENT_LABELS[kind]}: {title}
                    </p>
                  ))}
                </Message>
              )
            )
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div ref={box} className="pb-(--card-spacing)">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim()) send(text.trim())
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
    </div>
  )
}
