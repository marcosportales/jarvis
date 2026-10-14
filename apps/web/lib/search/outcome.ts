import { z } from "zod"

export const SEARCH_KINDS = [
  "web",
  "page",
  "news",
  "flights",
  "hotels",
  "places",
  "events",
] as const

export type SearchKind = (typeof SEARCH_KINDS)[number]

/** One labelled key fact on a Result, e.g. `{ label: "Precio", value: "412 €" }`. */
export type Fact = { label: string; value: string }

/** One thing a Search found, as the model reads it and a card shows it. */
export type SearchResult = {
  title: string
  subtitle?: string
  facts: Fact[]
  /** Opens in a new tab; never spoken. */
  url?: string
  /** Who published it, e.g. "MARCA" or "museodelprado.es". */
  source?: string
}

/**
 * What one Search found, boiled down from the provider's response. The same
 * shape is what the model reads and what the Results Widget shows.
 */
export type SearchOutcome = {
  kind: SearchKind
  /** Spanish, for the Widget header, e.g. "Vuelos MAD → FCO · vie 16 oct". */
  heading: string
  results: SearchResult[]
  /**
   * Text for the model beyond the Results, never shown as a card: the
   * provider's narrative answer for a web Search, the page's text for a page.
   */
  answer?: string
}

/** A Search Outcome as the Reply carries it to the client. */
export const searchOutcomeSchema = z.object({
  kind: z.enum(SEARCH_KINDS),
  heading: z.string(),
  results: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      facts: z.array(z.object({ label: z.string(), value: z.string() })),
      url: z.string().optional(),
      source: z.string().optional(),
    })
  ),
  answer: z.string().optional(),
}) satisfies z.ZodType<SearchOutcome>
