"use client"

import { ExternalLinkIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { domainOf } from "@/lib/browse/view"
import { shownResults } from "@/lib/search/browser-results"
import type { SearchResult } from "@/lib/search/outcome"
import type { WidgetProps } from "@/lib/widgets/registry"

/** Nothing was searched in this page load, e.g. right after a reload. */
const getServerSnapshot = () => null

/**
 * Shows the latest Search Outcome as one card per Result: a column in its
 * card, a grid with each Result in full when Expanded.
 */
export function ResultsWidget({ expanded }: Pick<WidgetProps, "expanded">) {
  const outcome = useSyncExternalStore(
    shownResults.subscribe,
    shownResults.get,
    getServerSnapshot
  )

  if (!outcome) {
    return (
      <p className="text-sm text-muted-foreground">Aún no hay resultados</p>
    )
  }

  return (
    <div className={cn("flex flex-col", expanded ? "gap-3" : "gap-2")}>
      <p className={cn("font-medium", expanded && "text-base")}>
        {outcome.heading}
      </p>
      {outcome.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          La búsqueda no encontró nada
        </p>
      ) : (
        <ol
          className={
            expanded
              ? "grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3"
              : "flex flex-col gap-2"
          }
        >
          {outcome.results.map((result, index) => (
            <li key={index} className={cn(expanded && "flex")}>
              <ResultCard result={result} expanded={expanded} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/**
 * A Result with a URL opens it in a new tab; one without is plain. Expanded,
 * it has room for its whole subtitle and where the link goes.
 */
function ResultCard({
  result: { title, subtitle, facts, url, source },
  expanded,
}: {
  result: SearchResult
  expanded: boolean
}) {
  const domain = expanded ? domainOf(url ?? null) : null
  return (
    <div
      className={cn(
        "flex flex-col rounded-md border text-sm",
        expanded ? "flex-1 gap-2 p-3" : "gap-1 p-2"
      )}
    >
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-1 font-medium hover:underline"
        >
          <span className="min-w-0 break-words">{title}</span>
          <ExternalLinkIcon className="mt-0.5 size-3 shrink-0" aria-hidden />
        </a>
      ) : (
        <p className="font-medium break-words">{title}</p>
      )}
      {subtitle && (
        <p
          className={cn(
            "text-muted-foreground",
            expanded ? "text-sm" : "line-clamp-2 text-xs"
          )}
        >
          {subtitle}
        </p>
      )}
      {facts.length > 0 && (
        <dl
          className={cn(
            "grid grid-cols-[auto_1fr] gap-x-2",
            expanded ? "gap-y-1 text-sm" : "text-xs"
          )}
        >
          {facts.map(({ label, value }, index) => (
            <div key={index} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(source || domain) && (
        <p className="mt-auto text-xs text-muted-foreground">
          {[source, domain !== source && domain].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  )
}
