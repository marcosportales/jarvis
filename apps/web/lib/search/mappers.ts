import { z } from "zod"

import type { Fact, SearchOutcome, SearchResult } from "./outcome"

/**
 * Pure functions from a raw `composio_search` response (ticket 01's shapes)
 * to a Search Outcome. They keep only what the Owner needs and drop the rest,
 * images and tokens included. A response they can't read throws.
 */

/** A spoken summary covers a few; the Results Widget scrolls through these. */
export const MAX_RESULTS = 10

/** Enough of a page to answer from without flooding the model. */
const MAX_PAGE_TEXT = 5_000

/** `www.museodelprado.es/…` → `museodelprado.es`; no source if unparseable. */
function siteOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return undefined
  }
}

/** Leaves out the optional fields a Result doesn't have. */
function result({
  title,
  subtitle,
  facts = [],
  url,
  source,
}: {
  title: string
  subtitle?: string | null
  facts?: (Fact | null | undefined)[]
  url?: string | null
  source?: string | null
}): SearchResult {
  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    facts: facts.filter((fact): fact is Fact => !!fact?.value),
    ...(url ? { url } : {}),
    ...(source ? { source } : {}),
  }
}

/** "13 oct 2026", or nothing for a date that doesn't parse. */
function calendarDate(iso: string | null | undefined) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date
    .toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Madrid",
    })
    .replace(/\./g, "")
}

const webSchema = z.object({
  answer: z.string().nullish(),
  citations: z
    .array(
      z.object({
        title: z.string().nullish(),
        url: z.string().nullish(),
        publishedDate: z.string().nullish(),
      })
    )
    .nullish(),
})

/** Citations become the Results; the narrative answer is a hint only. */
export function mapWeb(data: unknown, { query }: { query: string }) {
  const { answer, citations } = webSchema.parse(data)
  const results = (citations ?? []).flatMap(({ title, url, publishedDate }) => {
    if (!url) return []
    const source = siteOf(url)
    const date = calendarDate(publishedDate)
    return [
      result({
        title: title?.trim() || source || url,
        facts: [date ? { label: "Fecha", value: date } : null],
        url,
        source,
      }),
    ]
  })
  return {
    kind: "web",
    heading: `Búsqueda: ${query}`,
    results: results.slice(0, MAX_RESULTS),
    ...(answer?.trim() ? { answer: answer.trim() } : {}),
  } satisfies SearchOutcome
}

const pageSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().nullish(),
        url: z.string().nullish(),
        text: z.string().nullish(),
      })
    )
    .nullish(),
})

/** A page that couldn't be read has no Result and no text. */
export function mapPage(data: unknown, { url }: { url: string }) {
  const page = pageSchema.parse(data).results?.find(({ text }) => text?.trim())
  const pageUrl = page?.url ?? url
  const source = siteOf(pageUrl)
  const title = page?.title?.trim() || source || pageUrl
  if (!page?.text) {
    return { kind: "page", heading: title, results: [] } satisfies SearchOutcome
  }
  return {
    kind: "page",
    heading: title,
    results: [result({ title, url: pageUrl, source })],
    answer: page.text.trim().slice(0, MAX_PAGE_TEXT),
  } satisfies SearchOutcome
}
