# Spec: Search — Jarvis looks things up on the web, with a Results Widget

Status: ready-for-agent

## Problem Statement

Jarvis can only answer from what the model already knows, the weather, Memories and the Owner's Connected Plugins. Ask it "¿hay vuelos de Madrid a Roma el viernes?", "¿qué ha pasado hoy con…?", "¿a qué hora cierra el Prado?" or "busca un hotel en Lisboa para el puente" and it either says it can't know or, worse, guesses. The Owner wants Jarvis to look things up on the public web and answer with current facts. When the answer is a list (flights, hotels, places, news), a spoken Reply can't carry it, so the Owner also wants to see what Jarvis found on screen, with links to open.

## Solution

Search is built into Jarvis, like the weather. The Owner doesn't install, authorize or set up anything. During a Turn, Jarvis can search the web, read a web page, and search news, flights, hotels, places and events. It answers in the same Reply.

When a Search returns a list, Jarvis Shows a new built-in **Results Widget** that lays out what it found: one card per result with its key facts (e.g. airline, times, stops, price) and a link that opens in a new tab. The spoken Reply only sums it up ("El más barato es Iberia, 412 €, directo; te dejo el resto en pantalla") and never reads out URLs. When the answer is a single fact, Jarvis just says it and leaves the Widget alone.

Search goes through Composio's `composio_search` toolkit, which needs no authorization (ADR 0006). Jarvis does not get Composio's raw tools. It gets its own small Search tools, which call Composio and boil each response down to a compact Result shape. The model reads that shape, and the same shape fills the Results Widget.

## User Stories

### Asking

1. As the Owner, I want to ask Jarvis about anything current ("¿qué ha pasado hoy en…?", "¿cuánto cuesta…?") and get an answer from the web, so that Jarvis isn't limited to what the model already knows.
2. As the Owner, I want Search to work without installing or connecting anything, so that it's simply part of Jarvis.
3. As the Owner, I want to ask for flights between two places on a date ("vuelos de Madrid a Roma el viernes") and hear the best options, so that I can plan a trip by voice.
4. As the Owner, I want to ask for round trips, the number of passengers and the cabin class, so that flight results match my real trip.
5. As the Owner, I want to ask for hotels in a place for given dates, so that I can compare where to stay.
6. As the Owner, I want to ask for places nearby or in a city ("restaurantes japoneses cerca de Sol"), so that I get real places with ratings and addresses.
7. As the Owner, I want to ask for news on a topic, so that I hear what's happening now.
8. As the Owner, I want to ask for events ("conciertos en Madrid este fin de semana"), so that I can find plans.
9. As the Owner, I want Jarvis to read a specific web page when I give or mention one ("¿qué dice la web del Prado sobre los horarios?"), so that I get the page's actual content.
10. As the Owner, I want Jarvis to open the top result and read it when the search snippet isn't enough, so that its answer is grounded in the source.
11. As the Owner, I want Jarvis to resolve "hoy", "el viernes" or "el puente" against the current date, so that relative dates just work.
12. As the Owner, I want "desde casa" or a missing departure point to come from my Memories (e.g. my home city), so that I don't repeat it every time.
13. As the Owner, I want Jarvis to ask once for my departure point when it doesn't know it and offer to Remember it, so that it learns it for next time.
14. As the Owner, I want prices in euros and results in Spanish for Spain by default, so that I can read them without converting.
15. As the Owner, I want to name another currency or country when I need to ("en dólares"), so that I can override the default.
16. As the Owner, I want Search to work the same whether I spoke or typed, so that Jarvis behaves consistently.

### Hearing the answer

17. As the Owner, I want a short spoken summary of a list result (the best or cheapest option and how many more there are), so that I'm not read twelve flights out loud.
18. As the Owner, I want Jarvis never to read URLs out loud, so that the Reply stays listenable.
19. As the Owner, I want Jarvis to name its source only when it matters ("según El País…"), so that I know where a claim comes from without the Reply getting cluttered.
20. As the Owner, I want Jarvis to say plainly when a Search found nothing, so that it never makes something up.
21. As the Owner, I want Jarvis never to invent prices, times or availability, so that I can trust what it says.
22. As the Owner, I want Jarvis to answer from its own knowledge when Search fails, and say clearly that it couldn't check and that this may be out of date, so that the Turn still helps me.
23. As the Owner, I want a Search problem (Composio down, quota spent, a slow provider) never to break the Turn, so that Jarvis always replies.

### Seeing the results

24. As the Owner, I want the Results Widget to appear on its own when a Search returns a list, so that I can scan the options while Jarvis talks.
25. As the Owner, I want the Results Widget to stay as it is after single-fact answers, so that the screen doesn't flash for nothing.
26. As the Owner, I want each result as a card with the facts that matter for its kind (a flight's airline, times, duration, stops and price; a hotel's name, price per night and rating; a place's name, rating and address; a news item's headline, source and time), so that I can compare at a glance.
27. As the Owner, I want the Widget to say what was searched ("Vuelos MAD → FCO · vie 16 oct"), so that I know what I'm looking at.
28. As the Owner, I want every card that has a link to open it in a new browser tab, so that I can go on to book or read on the real site.
29. As the Owner, I want the Results Widget to be larger than the Weather Widget and scroll when there are many results, so that a list fits.
30. As the Owner, I want a new Search to replace what the Results Widget shows, so that it always shows the latest Search.
31. As the Owner, I want results to stay on screen until the next Search, even across further Turns that didn't search, so that I can keep talking about them.
32. As the Owner, I want to say "¿y el segundo?" or "¿cuál sale más temprano?" about the results on screen and get a right answer, so that I can dig into them by voice.
33. As the Owner, I want to close, drag, toggle and ask Jarvis to show, hide or move the Results Widget like any other Widget, so that it behaves consistently.
34. As the Owner, I want the Results Widget's Shown state and position remembered across reloads like other Widgets, so that my layout holds.
35. As the Owner, I want the Results Widget to show a quiet empty state after a reload ("Aún no hay resultados"), since results are not saved, so that it's clear rather than broken.
36. As the Owner, I want the Results Widget to show a "search found nothing" state when the latest Search came back empty, so that the screen agrees with what Jarvis said.

### Staying read-only

37. As the Owner, I want Search to only read the public web and never log in, book, buy or submit anything, so that nothing happens on my behalf without me.

## Implementation Decisions

### Search module (new)

- A new **Search** module on the server owns everything about looking things up. It sits behind a small **search port** over Composio, so tests can pass a fake. The port has one operation, which runs a `composio_search` tool by slug with arguments for the single Owner user id and returns its raw `data` or an error. The real port uses `@composio/core`'s tool execution with the existing `COMPOSIO_API_KEY`. It never opens an MCP session, and Plugins keep theirs.
- Search uses the following Composio tools, and no others: `COMPOSIO_SEARCH_WEB`, `COMPOSIO_SEARCH_FETCH_URL_CONTENT`, `COMPOSIO_SEARCH_NEWS`, `COMPOSIO_SEARCH_FLIGHTS`, `COMPOSIO_SEARCH_HOTELS`, `COMPOSIO_SEARCH_GOOGLE_MAPS`, `COMPOSIO_SEARCH_EVENT`. All are `NO_AUTH`, as confirmed against the live Composio catalog on 2026-10-14. Before mapping, the first ticket confirms each one's real input and output shape by calling it once and saving the response as a fixture.
- Each kind of search has a **mapper** from the raw Composio response to the shared **Search Outcome**:
  - `kind`: `web | page | news | flights | hotels | places | events`
  - `heading`: Spanish, for the Widget header, e.g. "Vuelos MAD → FCO · vie 16 oct"
  - `results`: list of Result, capped (around 10)
  - `answer`: optional; the narrative answer some providers give (e.g. `WEB`)
  - Result: `title`, optional `subtitle`, a short list of labelled `facts` (e.g. `{label: "Precio", value: "412 €"}`), optional `url`, optional `source`.
  Mappers are pure functions and drop everything else, including images, tracking tokens and raw booking tokens.
- The Search tools take Spanish descriptions and inputs, matching the existing tools. For example: `search_web` (query), `read_page` (url), `search_news` (query), `search_flights` (from, to, outbound date, optional return date, adults/children/infants, cabin class, currency), `search_hotels` (place, check-in, check-out, guests, currency), `search_places` (query, optional near), `search_events` (query, optional place). The tools set `hl=es`, `gl=es` and currency `EUR` unless the Owner names another.
- A tool's result for the model is a compact plain-text rendering of the Search Outcome (numbered results with their facts), in the same style as the weather tool's lines. The model never sees raw JSON.
- A failed or empty Search becomes an answer for the model, never a thrown error, as with the weather tool ("No he podido buscar ahora mismo…" / "La búsqueda no encontró nada."). The Turn continues.
- Mapping and rendering are cheap enough that a list Search stays within the existing `MAX_REPLY_STEPS = 5` budget (search → maybe read one page → answer). The limit is not raised.

### Turn module

- The Turn adds the Search tools to Jarvis's built-in tools. They are built-in, so they win over any Plugin tool with the same name under the existing merge rule.
- The Turn records the **latest Search Outcome produced in that Turn** (if any) and returns it on `TurnReply` as a new optional field, `search`. A Turn that ran several Searches returns the last one with results, or the last one if none had results.
- When a Turn's Search Outcome has more than one result, the Turn also adds a `show` WidgetChange for the Results Widget, unless the model already hid it explicitly in that Turn. Showing it automatically is a Turn rule, not something left to the prompt, so it doesn't depend on the model remembering to call `show_widget`.
- The client sends the **Results currently on screen** back with each Turn, the way it already sends the Widget layout, as the heading plus each result's title and facts but no URLs. The Turn adds them as a notice, so that "¿y el segundo?" works without searching again. The server stays stateless about results, keeping with "results are not saved".
- The system prompt gains a short Search section: search when the answer depends on current or outside facts; never invent prices, times or availability; give a spoken summary of lists and leave them on screen; never say URLs; name a source only when it matters; when Search fails, say so and answer from general knowledge marked as possibly out of date; use the Owner's Memories for implied places, and otherwise ask once and offer to Remember.

### Results Widget (new built-in Widget)

- A new entry in the Widget catalog, `results` ("Resultados"), built-in, with no settings schema, a Starting Spot in the left margin (left-top), and a larger default size than Weather that scrolls inside.
- Its content is **not** a Widget Setting, because settings are persisted and results are not. The client Session keeps the latest Search Outcome in memory, replaces it whenever a Reply carries `search`, and the Results Widget reads it from there. After a reload the content is empty, while the Widget's Shown state and position persist as usual.
- Every link opens in a new tab with `rel="noopener noreferrer"`. Results without a URL are plain cards.
- The Reply contract between the reply route and the client grows by the optional `search` field. It is validated on the client like the existing `widgetChanges` and `memoryEvents` fields.

### Vocabulary

- **Search**, **Results Widget** are defined in `CONTEXT.md`. Use them in code comments and names (`search`, `results`), and avoid "lookup" or "query" as domain nouns.

## Testing Decisions

- Good tests here check what the Owner gets: the Reply text, the Widget changes and the `search` outcome returned by a Turn, and what the Results Widget shows for a given outcome. They don't check which internal function was called or the exact prompt text.
- **Main seam: the Turn module (`createTurns(...).take`)**, driven by the existing `MockLanguageModelV4` step helpers (`call`, `answer`) and a new **fake search port** in a fixtures file next to the Search module, the same way `fakeComposio` and `fakeFetch` serve the plugins and weather tests. Cases:
  - a flight question → the model calls `search_flights` → the fake port gets the expected slug and `hl/gl/currency` → the Turn returns a `search` outcome with mapped flights and a `show results` WidgetChange
  - a single-fact web Search → no Results Widget change
  - the search port throws or times out → the Turn still replies, and the model saw the failure line
  - an empty Search → `search` with no results, and no automatic show
  - the Results on screen sent with the request appear in the model's system prompt
  - a Plugin tool named like a Search tool is left out (existing merge rule)
- **Second seam: the mappers**, as pure functions over recorded Composio responses (the fixtures saved in the first ticket), in the style of `weather.test.ts` over its fixtures. This seam exists only because provider shapes are the most likely thing to break and are tedious to reach through a whole Turn.
- **Client:** extend the existing client Session tests (`session.test.ts`) so that a Reply carrying `search` replaces the in-memory Search Outcome and a Reply without one keeps it. The Results Widget component itself is checked by running the app, the same as the Weather Widget.
- No tests call the real Composio. The first ticket's manual confirmation run is the only live call.

## Out of Scope

- Browse (a remote browser working through websites, watched live). It has its own spec in `.scratch/browse/`.
- Booking, buying, logging in, filling forms or any write action.
- Shopping, finance, scholar, trends, images, Amazon/Walmart and the other `composio_search` tools beyond the seven listed. Each can be added later as a mapper.
- Saving results with the Session, a history of past Searches, or bringing back an old Session's results.
- An in-app browser the Owner drives themselves. Most sites refuse to be embedded, so it was dropped.
- Plugin Widgets / MCP Apps (ADR 0003). The Results Widget is built-in.
- Paying for our own Tavily, Exa or SerpAPI keys.
- Raising `MAX_REPLY_STEPS`.

## Further Notes

- Decisions come from the grilling session on 2026-10-14 and are recorded in ADR 0006 and `CONTEXT.md` (Search, Results Widget, and the reworded opening paragraph).
- Search spends Composio tool-call quota from the same free tier as the Plugins. Check usage after the first week of real use.
- The `COMPOSIO_SEARCH_WEB` description says to prefer its `citations` over its narrative `answer`. The web mapper turns citations into Results and keeps `answer` as a hint only.
- Departure points are city or airport names from the Owner. The flights tool resolves them to the IATA codes the provider expects (`departure_id` / `arrival_id`). Confirm in the first ticket whether `COMPOSIO_SEARCH_FLIGHTS` accepts city names or needs codes. If it needs codes, the model supplies them and the tool description says so.
