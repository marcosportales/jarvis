# 01: Confirm Composio's Search tools live and record fixtures

**What to build:** A written check, appended to this ticket under `## Answer`, of the seven `composio_search` tools the spec relies on (`COMPOSIO_SEARCH_WEB`, `COMPOSIO_SEARCH_FETCH_URL_CONTENT`, `COMPOSIO_SEARCH_NEWS`, `COMPOSIO_SEARCH_FLIGHTS`, `COMPOSIO_SEARCH_HOTELS`, `COMPOSIO_SEARCH_GOOGLE_MAPS`, `COMPOSIO_SEARCH_EVENT`). Call each one once through `@composio/core` with the existing `COMPOSIO_API_KEY` and the Owner's user id, using Spanish inputs (`hl=es`, `gl=es`, `EUR` where they apply). Save each raw response as a fixture next to the future Search module, trimmed to a few results, so the mapper tests can use real shapes. Finish by writing down the final shape of the **search port**. If any assumption is wrong in a way that changes what the Owner gets, stop and update the spec instead of working around it.

Check:
- The real input names and which are required, especially whether flights take city names or need IATA codes (`departure_id` / `arrival_id`) and how dates are formatted.
- The real output shape of each tool, and which fields carry the title, the key facts, the link and the source.
- Whether results come back in Spanish and euros with those inputs.
- How a failure looks (thrown error vs `successful: false` with `error`) and how long each call takes.
- That `composio_search` stays `NO_AUTH`: no connected account is needed.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every point above answered, with the call made and what came back
- [x] One trimmed fixture saved for each of the seven tools
- [x] The final search port interface written down
- [x] Spec updated if any assumption changed

## Answer

Checked live on 2026-10-14 through `@composio/core` 0.23.0, using `composio.tools.execute(slug, { userId: "jarvis-owner", version: "20260903_00", arguments })` with the existing `COMPOSIO_API_KEY`. All seven tools are toolkit `composio_search`, version `20260903_00`. They ran with no connected account, so `NO_AUTH` holds. Raw responses are trimmed into `apps/web/lib/search/fixtures.ts`, one fixture per tool plus a few extra cases.

### Calls made

| Tool | Arguments | Time | What came back |
|---|---|---|---|
| `COMPOSIO_SEARCH_WEB` | `query: "horario Museo del Prado octubre 2026"` | 2.3 s | `{ answer, citations[] }`; Spanish answer with `[n]` markers |
| `COMPOSIO_SEARCH_FETCH_URL_CONTENT` | `urls: [prado /visita-museo]`, `max_characters: 4000` | 3.0 s | `successful: true`, but `results: []` and `statuses[0].status: "error"` (`CRAWL_UNKNOWN_ERROR`) |
| `COMPOSIO_SEARCH_FETCH_URL_CONTENT` | `urls: [prado /visita/horarios-y-tarifas]`, `max_characters: 3000` | 0.9 s | `results[0]: { title, url, id, text }`, markdown text in Spanish |
| `COMPOSIO_SEARCH_NEWS` | `query: "Real Madrid", hl: es, gl: es` | 1.7 s | `{ news_results[], has_results, total_results }`, Spanish sources and relative dates ("hace 16 horas") |
| `COMPOSIO_SEARCH_FLIGHTS` | `departure_id: MAD, arrival_id: FCO, outbound_date: 2026-10-16, currency: EUR, hl: es, gl: es` | 2.4 s | `results.{ best_flights[], other_flights[], airports, price_insights, search_metadata }`, prices in EUR, Spanish airport names |
| `COMPOSIO_SEARCH_FLIGHTS` | `query: "Madrid a Roma"`, same date | 0.8 s | `successful: false`: "Could not determine departure airport. Please provide 'departure_id'…" |
| `COMPOSIO_SEARCH_FLIGHTS` | MAD → HND, 2026-11-10 | 4.1 s | Flights with `layovers[]` and several `flights[]` legs |
| `COMPOSIO_SEARCH_FLIGHTS` | MAD ⇄ LIS, 2026-11-03 to 2026-11-07, `adults: 2` | 1.7 s | `type: "Round trip"`, only the outbound legs, one `price` for the trip and a `departure_token` |
| `COMPOSIO_SEARCH_HOTELS` | `q: "Lisboa", check_in_date: 2026-11-03, check_out_date: 2026-11-07, adults: 2, currency: EUR, hl: es, gl: es` | 5.4 s | `results.properties[]`, Spanish descriptions, `rate_per_night.extracted_lowest` in EUR |
| `COMPOSIO_SEARCH_GOOGLE_MAPS` | `q: "restaurantes japoneses cerca de Sol, Madrid"` | 4.2 s | `results.local_results[]`, but in English (`hl: "en"` in `search_parameters`) |
| `COMPOSIO_SEARCH_EVENT` | `query: "conciertos", location: "Madrid", hl: es, gl: es` | 7.0 s | `results.events_results[]`, Spanish titles but English dates ("Oct 16, 7:30 PM") and no links |
| `COMPOSIO_SEARCH_FLIGHTS` | `outbound_date: 2020-01-01` | 0.7 s | `successful: false`: "outbound_date '2020-01-01' cannot be in the past…" |

### Inputs

- **Web**: `query` (required).
- **Page**: `urls` (required, array, single string also accepted), `max_characters`, `text` (default true), `summary`, `extras`.
- **News**: `query`, `hl`, `gl`, `when` (`d|w|m|y`), `start`. Nothing is marked required.
- **Flights**: `departure_id` / `arrival_id` are **IATA codes** (3 uppercase letters) and are required unless `query` is given. A natural `query` only parses English ("Lahore to San Francisco"); "Madrid a Roma" fails. Dates are `YYYY-MM-DD` (`outbound_date`, `return_date`) and must not be in the past. Also `adults` (default 1), `children`, `infants`, `travel_class` (1 economy, 2 premium economy, 3 business, 4 first), `currency`, `hl`, `gl`.
- **Hotels**: `q`, `check_in_date`, `check_out_date` (required, `YYYY-MM-DD`), plus `adults` (default 2), `children`, `currency`, `hl`, `gl`, `sort_by`, price and class filters.
- **Google Maps**: `q` (required), `ll` (`@lat,lng,zoom`), `start`. It has **no `hl` or `gl`**.
- **Events**: `query` (required, must name an event type), `location` (city name only), `hl`, `gl`, `htichips`, `start`.

### Where the fields are

- **Web**: `answer` (narrative, Spanish, with `[n]` markers). `citations[]` carry `title`, `url`, and sometimes `publishedDate` and `author`. There is no snippet.
- **Page**: `results[]` carry `title`, `url`, `text`. A failed crawl leaves `results` empty with `statuses[].error`.
- **News**: `news_results[]` carry `title`, `snippet`, `link`, `source`, `date` (relative, Spanish) and `published_at`.
- **Flights**: `best_flights[]` then `other_flights[]`. Each has `price` (for all passengers together, round trip included: MAD ⇄ LIS was 95 USD for one adult and 189 USD for two, checked while verifying ticket 05), `total_duration` (minutes), `type`, `flights[]` legs (`airline`, `flight_number`, `departure_airport` / `arrival_airport` with `id`, `name`, `time` as `YYYY-MM-DD HH:mm`, `duration`, `travel_class`), optional `layovers[]` (`id`, `name`, `duration`), and `booking_token`. No result has its own link; `search_metadata.google_flights_url` opens the whole search.
- **Hotels**: `properties[]` carry `name`, `type`, `hotel_class`, `description`, `link`, `overall_rating`, `reviews`, `rate_per_night.{ lowest, extracted_lowest }`, `total_rate`, `address` (sometimes) and `property_token`.
- **Google Maps**: `local_results[]` (or `place_results` for a single place) carry `title`, `type`, `address`, `rating`, `reviews`, `website` (sometimes), `place_id` and `hours`.
- **Events**: `events_results[]` carry `title`, `date.{ start_date, when }`, `address[]` and `venue.name`. There's **no `link`** in any of them.

### Language and currency

With `hl=es`, `gl=es` and `EUR`, web, page, news, flights and hotels come back in Spanish with prices in euros. Google Maps can't take a language and answered in English (place types, opening hours). Events honoured the region but gave dates in English. Both are fine for the model, which speaks Spanish anyway. The cards show the English place type and event date as given.

### Failures and timing

- A tool that runs but fails (bad arguments, a date in the past, an unparseable query) resolves with `successful: false` and an `error` string. It doesn't throw.
- An unknown slug, auth or network trouble throws (`ComposioToolNotFoundError`, …). An `AbortSignal.timeout` also throws.
- A page that can't be crawled is `successful: true` with no results, so the page mapper has to treat "no results" as "couldn't read it".
- Calls took 0.7–7 s, with events and hotels the slowest. A 20 s timeout leaves room.
- `execute` needs a pinned `version`, or else `dangerouslySkipVersionCheck`. The port pins `20260903_00`.

### The search port

```ts
type SearchSlug =
  | "COMPOSIO_SEARCH_WEB" | "COMPOSIO_SEARCH_FETCH_URL_CONTENT" | "COMPOSIO_SEARCH_NEWS"
  | "COMPOSIO_SEARCH_FLIGHTS" | "COMPOSIO_SEARCH_HOTELS" | "COMPOSIO_SEARCH_GOOGLE_MAPS"
  | "COMPOSIO_SEARCH_EVENT"

/** Runs one composio_search tool for the Owner; its raw `data`, or throws. */
type SearchPort = {
  run(slug: SearchSlug, args: Record<string, unknown>): Promise<unknown>
}
```

The real port (`apps/web/lib/search/port.ts`) turns `successful: false` into a thrown `SearchFailedError`, so every failure reaches the tools the same way. The tools catch it and give the model a line instead.

### What changed in the spec

- Flights need IATA codes, so the model supplies them and the tool description says so. The spec had left this open.
- Event cards have no link, and places and events aren't fully in Spanish. The spec now says so.
