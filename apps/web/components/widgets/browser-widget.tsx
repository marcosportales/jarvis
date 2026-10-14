"use client"

import { ExternalLinkIcon, SquareIcon } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { shownBrowse } from "@/lib/browse/browser-view"
import { domainOf, endedLabel, type BrowseView } from "@/lib/browse/view"

/** How long the Widget stays highlighted once the Browse Task ends. */
const HIGHLIGHT_MS = 3_000

/** The Browse Task isn't known until the page loads it. */
const getServerSnapshot = () => null

/**
 * The current Browse Task: the remote browser's screen live while it runs,
 * with what it is doing and a stop button; its outcome once it ends.
 */
export function BrowserWidget() {
  const shown = useSyncExternalStore(
    shownBrowse.subscribe,
    shownBrowse.get,
    getServerSnapshot
  )
  const view = shown?.view ?? null
  const highlighted = useHighlight(shown?.justEnded === true, view?.endedAt)

  if (!view) {
    return (
      <p className="text-sm text-muted-foreground">No hay ninguna navegación</p>
    )
  }

  const running = view.status === "running"
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md p-1 text-sm transition-shadow duration-500",
        // Inset, as the Widget's scrolling body would clip one outside.
        highlighted && "ring-2 ring-primary ring-inset"
      )}
    >
      <p className="line-clamp-2 font-medium">{view.task}</p>
      <Screen view={view} />
      {running ? <Progress view={view} /> : <Outcome view={view} />}
      {running && <Controls view={view} stop={shown?.stop} />}
    </div>
  )
}

/**
 * True for a few seconds after the page saw the Browse Task end, keyed by
 * when it ended so each ending highlights once.
 */
function useHighlight(justEnded: boolean, endedAt: Date | null | undefined) {
  const key = endedAt?.getTime() ?? null
  const [faded, setFaded] = useState<number | null>(null)
  const highlighted = justEnded && key !== null && key !== faded
  useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setFaded(key), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlighted, key])
  return highlighted
}

/**
 * The live view while running; once ended the remote browser is gone, so
 * the last screenshot. The Owner watches but can't click into it.
 */
function Screen({ view }: { view: BrowseView }) {
  const live = view.status === "running" ? view.liveViewUrl : null
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border bg-muted">
      {live ? (
        <iframe
          src={live}
          title="Pantalla del navegador remoto"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          className="pointer-events-none size-full border-0"
        />
      ) : view.screenshotUrl ? (
        // A remote screenshot that changes each step; no optimisation to gain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={view.screenshotUrl}
          alt="Última pantalla del navegador remoto"
          className="size-full object-cover object-top"
        />
      ) : (
        <p className="flex size-full items-center justify-center text-xs text-muted-foreground">
          {view.status === "running"
            ? "Abriendo el navegador…"
            : "Sin imagen de la pantalla"}
        </p>
      )}
    </div>
  )
}

function Progress({ view }: { view: BrowseView }) {
  const where = domainOf(view.currentUrl)
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Spinner className="mt-0.5 shrink-0" />
      <span className="line-clamp-2 min-w-0">
        {view.currentGoal ?? "Empezando…"}
        {where && ` · ${where}`}
      </span>
    </p>
  )
}

function Outcome({ view }: { view: BrowseView }) {
  const label = endedLabel(view)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {view.outcome && <p className="whitespace-pre-line">{view.outcome}</p>}
      {view.currentUrl && (
        <a
          href={view.currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <span className="truncate">
            {domainOf(view.currentUrl) ?? view.currentUrl}
          </span>
          <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
        </a>
      )}
    </div>
  )
}

function Controls({
  view,
  stop,
}: {
  view: BrowseView
  stop: (() => Promise<boolean>) | undefined
}) {
  const [stopping, setStopping] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onStop() {
    if (!stop) return
    setStopping(true)
    setFailed(false)
    const stopped = await stop()
    setStopping(false)
    setFailed(!stopped)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        className="cursor-pointer"
        disabled={!stop || stopping}
        onClick={onStop}
      >
        {stopping ? <Spinner /> : <SquareIcon />}
        Parar
      </Button>
      {view.liveViewUrl && (
        <a
          href={view.liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ver en directo
          <ExternalLinkIcon />
        </a>
      )}
      {failed && (
        <span className="text-xs text-destructive">No he podido pararla</span>
      )}
    </div>
  )
}
