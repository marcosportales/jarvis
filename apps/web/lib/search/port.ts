import { Composio } from "@composio/core"

import { OWNER_USER_ID } from "../plugins/composio"

/** The `composio_search` tools Search uses, and no others (ADR 0006). */
export const SEARCH_SLUGS = [
  "COMPOSIO_SEARCH_WEB",
  "COMPOSIO_SEARCH_FETCH_URL_CONTENT",
  "COMPOSIO_SEARCH_NEWS",
  "COMPOSIO_SEARCH_FLIGHTS",
  "COMPOSIO_SEARCH_HOTELS",
  "COMPOSIO_SEARCH_GOOGLE_MAPS",
  "COMPOSIO_SEARCH_EVENT",
] as const

export type SearchSlug = (typeof SEARCH_SLUGS)[number]

/**
 * What the Search module needs from Composio: run one `composio_search` tool
 * for the Owner and get its raw `data` back. Throws when Composio can't be
 * reached or the tool reports a failure.
 */
export type SearchPort = {
  run(slug: SearchSlug, args: Record<string, unknown>): Promise<unknown>
}

/** The toolkit version the fixtures were recorded with (ticket 01). */
export const SEARCH_TOOLKIT_VERSION = "20260903_00"

/** Events and hotels took 5–7 s when confirmed; more than this is down. */
const SEARCH_TIMEOUT_MS = 20_000

/** A Search tool that ran but reported a failure, e.g. invalid arguments. */
export class SearchFailedError extends Error {}

/**
 * The real port over `@composio/core`. `composio_search` is `NO_AUTH`, so it
 * runs with no connected account and never opens an MCP session. Without an
 * API key every Search fails, which the tools turn into an answer.
 */
export function createComposioSearchPort(
  apiKey: string | undefined
): SearchPort {
  const composio = apiKey ? new Composio({ apiKey }) : null

  return {
    async run(slug, args) {
      if (!composio) throw new SearchFailedError("COMPOSIO_API_KEY is not set")
      const response = await composio.tools.execute(
        slug,
        {
          userId: OWNER_USER_ID,
          version: SEARCH_TOOLKIT_VERSION,
          arguments: args,
        },
        { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) }
      )
      if (!response.successful) {
        throw new SearchFailedError(response.error ?? `${slug} failed`)
      }
      return response.data
    },
  }
}
