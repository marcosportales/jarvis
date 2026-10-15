"use client"

// PROTOTYPE — throwaway. Three layouts of the Jarvis page with the Orb and
// voice in the centre and the Transcript moved into a Transcript Widget,
// switchable via `?variant=A|B|C` on the existing Jarvis routes. The widget
// here is a mock card with its own in-memory Hidden/Shown/Expanded state,
// not a real entry on the Widget Board.

import { Maximize2Icon, Minimize2Icon, PencilIcon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
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
import { cn } from "@workspace/ui/lib/utils"

import { Orb } from "@/components/orb"
import { PrototypeSwitcher } from "@/components/prototype-switcher"
import { isTypingTarget } from "@/lib/is-typing-target"
import type { JarvisState, TranscriptEntry } from "@/lib/jarvis/session"
import type { MemoryEvent } from "@/lib/memory/events"

const VARIANTS = [
  { key: "A", name: "Bajo el Orbe" },
  { key: "B", name: "Subtítulos" },
  { key: "C", name: "Último Turno" },
] as const

const STATE_LABELS: Record<JarvisState, string> = {
  idle: "Mantén pulsado para hablar",
  listening: "Escuchando…",
  thinking: "Pensando…",
  speaking: "Hablando…",
}

const MEMORY_EVENT_LABELS: Record<MemoryEvent["kind"], string> = {
  remembered: "Recordado",
  forgotten: "Olvidado",
}

const WELCOME = "Hola, soy Jarvis"
const WELCOME_HINT =
  "Mantén pulsado el orbe o la barra espaciadora para hablar, o pulsa Enter para escribir."

type WidgetMode = "hidden" | "shown" | "expanded"

export type PrototypeProps = {
  variant: string
  state: JarvisState
  transcript: TranscriptEntry[]
  hint: string | null
  onPress(): void
  onRelease(): void
  sendTypedMessage(text: string): void
}

/** The last Turn: the Owner's words and whatever came after them. */
function lastTurn(transcript: TranscriptEntry[]) {
  const ownerIndex = transcript.map((e) => e.role).lastIndexOf("owner")
  const after = ownerIndex === -1 ? transcript : transcript.slice(ownerIndex + 1)
  return {
    owner: ownerIndex === -1 ? undefined : transcript[ownerIndex],
    reply: after.find((e) => e.role === "jarvis"),
    error: after.find((e) => e.role === "error"),
  }
}

export function JarvisLayoutPrototype(props: PrototypeProps) {
  const { variant, state, transcript } = props
  // Starts Shown, like the Transcript Widget's first-ever load.
  const [mode, setMode] = useState<WidgetMode>("shown")
  const [focusRequest, setFocusRequest] = useState(0)

  function openToType() {
    setMode((current) => (current === "hidden" ? "shown" : current))
    setFocusRequest((n) => n + 1)
  }

  // Enter or "/" outside a text field opens the widget to type.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      if (event.key === "Enter" || event.key === "/") {
        event.preventDefault()
        openToType()
      }
      if (event.key === "Escape") {
        setMode((current) => (current === "expanded" ? "shown" : current))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (focusRequest === 0) return
    document
      .querySelector<HTMLTextAreaElement>("[data-transcript-widget] textarea")
      ?.focus()
  }, [focusRequest])

  // Captions only while the Transcript Widget is Hidden; cleared while the
  // next Utterance is being captured.
  const captions = mode === "hidden" && state !== "listening"
  const turn = lastTurn(transcript)
  const centre = {
    ...props,
    captions,
    turn,
    empty: transcript.length === 0,
    openToType,
  }

  return (
    <>
      {variant === "B" ? (
        <VariantB {...centre} />
      ) : variant === "C" ? (
        <VariantC {...centre} />
      ) : (
        <VariantA {...centre} />
      )}
      <TranscriptWidgetMock {...props} mode={mode} setMode={setMode} />
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        status={`widget ${mode} · ${state}`}
      />
    </>
  )
}

type CentreProps = PrototypeProps & {
  captions: boolean
  turn: ReturnType<typeof lastTurn>
  empty: boolean
  openToType(): void
}

function MemoryLine({ entry }: { entry?: TranscriptEntry }) {
  if (!entry?.memoryEvents?.length) return null
  return (
    <p className="text-xs text-muted-foreground">
      {entry.memoryEvents
        .map(({ kind, title }) => `${MEMORY_EVENT_LABELS[kind]}: ${title}`)
        .join(" · ")}
    </p>
  )
}

function TypeButton({ onClick }: { onClick(): void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="cursor-pointer text-muted-foreground"
      onClick={onClick}
    >
      <PencilIcon /> Escribir
    </Button>
  )
}

/** A: captions stacked right under the Orb, in the middle of the page. */
function VariantA({
  state,
  hint,
  onPress,
  onRelease,
  captions,
  turn,
  empty,
  openToType,
}: CentreProps) {
  return (
    <div className="mx-auto flex h-svh w-full max-w-2xl flex-col items-center justify-center gap-3 p-4 text-center max-sm:pb-[45svh]">
      <Orb state={state} onPress={onPress} onRelease={onRelease} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {STATE_LABELS[state]}
      </p>
      <p className="h-5 text-sm text-muted-foreground">{hint}</p>
      {captions && (
        <div className="flex min-h-32 flex-col items-center gap-2">
          {empty ? (
            <>
              <p className="text-lg font-medium">{WELCOME}</p>
              <p className="text-sm text-muted-foreground">{WELCOME_HINT}</p>
            </>
          ) : (
            <>
              {turn.owner && (
                <p className="text-sm text-muted-foreground italic">
                  «{turn.owner.text}»
                </p>
              )}
              {turn.reply && (
                <p
                  className="line-clamp-6 text-lg text-balance"
                  aria-live="polite"
                >
                  {turn.reply.text}
                </p>
              )}
              {turn.error && (
                <p role="alert" className="text-sm text-destructive">
                  {turn.error.text}
                </p>
              )}
              <MemoryLine entry={turn.reply} />
            </>
          )}
        </div>
      )}
      <TypeButton onClick={openToType} />
    </div>
  )
}

/** B: a bigger Orb alone in the middle, captions as film subtitles low down. */
function VariantB({
  state,
  hint,
  onPress,
  onRelease,
  captions,
  turn,
  empty,
  openToType,
}: CentreProps) {
  return (
    <div className="relative mx-auto flex h-svh w-full max-w-2xl flex-col items-center justify-center p-4 max-sm:pb-[45svh]">
      <Orb
        state={state}
        className="size-64 max-sm:size-48"
        onPress={onPress}
        onRelease={onRelease}
      />
      <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
        {STATE_LABELS[state]}
      </p>
      <p className="h-5 text-sm text-muted-foreground">{hint}</p>
      <div className="absolute inset-x-4 bottom-20 flex flex-col items-center gap-2 max-sm:bottom-[47svh]">
        {captions && (empty || turn.owner || turn.error) && (
          <div className="max-w-full rounded-lg bg-black/70 px-4 py-2 text-center text-white">
            {empty ? (
              <p>{WELCOME} — {WELCOME_HINT}</p>
            ) : (
              <>
                {turn.owner && (
                  <p className="text-xs opacity-70">Tú: {turn.owner.text}</p>
                )}
                {turn.reply && (
                  <p className="line-clamp-4 text-base" aria-live="polite">
                    {turn.reply.text}
                  </p>
                )}
                {turn.error && (
                  <p role="alert" className="text-sm text-red-300">
                    {turn.error.text}
                  </p>
                )}
                {turn.reply?.memoryEvents?.map(({ kind, title }, i) => (
                  <p key={i} className="text-xs opacity-70">
                    {MEMORY_EVENT_LABELS[kind]}: {title}
                  </p>
                ))}
              </>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Escribir"
          title="Escribir (Enter)"
          className="cursor-pointer rounded-full"
          onClick={openToType}
        >
          <PencilIcon />
        </Button>
      </div>
    </div>
  )
}

/** C: a smaller Orb high up, the last Turn as two bubbles below it. */
function VariantC({
  state,
  hint,
  onPress,
  onRelease,
  captions,
  turn,
  empty,
  openToType,
}: CentreProps) {
  return (
    <div className="mx-auto flex h-svh w-full max-w-2xl flex-col items-center gap-4 p-4 pt-[12svh] max-sm:pb-[45svh]">
      <Orb
        state={state}
        className="size-36"
        onPress={onPress}
        onRelease={onRelease}
      />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {STATE_LABELS[state]} {hint && `· ${hint}`}
      </p>
      {captions && (
        <div className="flex w-full flex-col gap-2">
          {empty ? (
            <ConversationEmptyState title={WELCOME} description={WELCOME_HINT} />
          ) : (
            <>
              {turn.owner && (
                <Message from="user">
                  <MessageContent>{turn.owner.text}</MessageContent>
                </Message>
              )}
              {turn.reply && (
                <Message from="assistant">
                  <MessageContent>
                    <span className="line-clamp-6">{turn.reply.text}</span>
                  </MessageContent>
                  <MemoryLine entry={turn.reply} />
                </Message>
              )}
              {turn.error && (
                <p role="alert" className="text-center text-sm text-destructive">
                  {turn.error.text}
                </p>
              )}
            </>
          )}
        </div>
      )}
      <button
        type="button"
        className="mt-auto w-full max-w-md cursor-text rounded-full border px-4 py-2 text-left text-sm text-muted-foreground"
        onClick={openToType}
      >
        Escribe a Jarvis… <kbd className="float-right opacity-60">Enter</kbd>
      </button>
    </div>
  )
}

/**
 * Mock Transcript Widget. Desktop: a card at left-bottom; Expanded, centred
 * over a backdrop. Phone: pinned to the bottom edge, full width.
 */
function TranscriptWidgetMock({
  state,
  transcript,
  sendTypedMessage,
  mode,
  setMode,
}: PrototypeProps & {
  mode: WidgetMode
  setMode(mode: WidgetMode): void
}) {
  if (mode === "hidden") return null
  const expanded = mode === "expanded"
  const busy = state === "listening" || state === "thinking"
  return (
    <>
      {expanded && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setMode("shown")}
        />
      )}
      <Card
        size="sm"
        role="region"
        aria-label="Conversación"
        data-transcript-widget
        className={cn(
          "fixed z-30 flex flex-col gap-2",
          expanded
            ? "inset-0 z-40 m-auto h-[85vh] w-[90vw] max-w-3xl shadow-2xl max-sm:h-svh max-sm:w-full max-sm:rounded-none"
            : "bottom-4 left-4 h-[520px] max-h-[calc(100svh-2rem)] w-[360px] max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[42svh] max-sm:w-full max-sm:rounded-b-none"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-(--card-spacing)">
          <span className="text-xs font-medium text-muted-foreground">
            Conversación
          </span>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={expanded ? "Reducir" : "Ampliar"}
              className="cursor-pointer"
              onClick={() => setMode(expanded ? "shown" : "expanded")}
            >
              {expanded ? <Minimize2Icon /> : <Maximize2Icon />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Cerrar"
              className="cursor-pointer"
              onClick={() => setMode(expanded ? "shown" : "hidden")}
            >
              <XIcon />
            </Button>
          </span>
        </div>
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {transcript.length === 0 ? (
              <ConversationEmptyState
                title={WELCOME}
                description="Habla con el orbe, o escribe abajo."
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
        <div className="px-(--card-spacing)">
          <PromptInput
            onSubmit={({ text }) => {
              if (text.trim()) sendTypedMessage(text.trim())
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
      </Card>
    </>
  )
}
