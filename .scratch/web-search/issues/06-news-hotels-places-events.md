# 06: Jarvis searches news, hotels, places and events

**What to build:** The other kinds of search in the spec, each one tool plus one mapper into the Search Outcome, shown as cards in the Results Widget:
- `search_news` (query): headline, source, time and link.
- `search_hotels` (place, check-in, check-out, guests, currency): name, price per night in euros, rating and link.
- `search_places` (query, optional near): name, rating, address and link. Uses `COMPOSIO_SEARCH_GOOGLE_MAPS`.
- `search_events` (query, optional place): name, date, venue and link.
All default to Spanish and Spain. Each has a heading in the Widget header ("Hoteles en Lisboa · 3–7 nov").

**Blocked by:** 03

**Status:** done

- [x] Mapper tests over the ticket 01 fixtures for news, hotels, places and events
- [x] A Turn test per tool: the fake port gets the right slug and inputs, and the Reply carries the matching outcome
- [x] In the running app, one real question of each kind gets a spoken summary and cards
- [x] Typecheck, lint and the full test suite pass
