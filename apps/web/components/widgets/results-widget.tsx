"use client"

import { ExternalLinkIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { shownResults } from "@/lib/search/browser-results"
import type { SearchResult } from "@/lib/search/outcome"

/** Nothing was searched in this page load, e.g. right after a reload. */
const getServerSnapshot = () => null

/** Shows the latest Search Outcome as one card per Result. */
export function ResultsWidget() {
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
    <div className="flex flex-col gap-2">
      <p className="font-medium">{outcome.heading}</p>
      {outcome.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          La búsqueda no encontró nada
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {outcome.results.map((result, index) => (
            <li key={index}>
              <ResultCard result={result} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** A Result with a URL opens it in a new tab; one without is plain. */
function ResultCard({
  result: { title, subtitle, facts, url, source },
}: {
  result: SearchResult
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-2 text-sm">
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
        <p className="line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
          {facts.map(({ label, value }, index) => (
            <div key={index} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {source && <p className="text-xs text-muted-foreground">{source}</p>}
    </div>
  )
}
