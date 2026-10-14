---
status: accepted
---

# The Map Widget is Google Maps throughout, with Jarvis's own key

The Map Widget draws the map with the Google Maps JavaScript API, using an API key from our own Google Cloud project with billing enabled. Jarvis's map tools (finding places, place details, Routes) go through Composio's `google_maps` toolkit, connected with that same key. Composio's toolkit only returns data and can't draw a map. Google's terms forbid showing Places or Routes data on a non-Google map, which rules out the free mix of Google data on MapLibre/OpenStreetMap tiles. We also considered the free Maps Embed API, which shows only one place, search or route at a time with no Markers of our own, and an all-open stack (MapLibre, Nominatim, OSRM), whose place search is too weak for "find me a café nearby". The key is Jarvis's, not an authorization from the Owner, so the Map is built into Jarvis like Search (ADR 0006), not a Plugin.

## Consequences

- One-time setup outside the repo: a Google Cloud project with billing, the Maps JavaScript, Places and Routes APIs enabled, and a key restricted to them and to Jarvis's origin. Google's free monthly usage is expected to cover one Owner.
- The key ends up in the page, so its restrictions are what protect it.
- Composio's `google_maps` responses need small mappers to our own Place and Route shapes, as Search's do (ADR 0006).
