---
status: accepted
---

# The Map Widget is Google Maps throughout, with Jarvis's own keys

The Map Widget draws the map with the Google Maps JavaScript API, using API keys from our own Google Cloud project with billing enabled. Jarvis's map tools (finding places, place details, Routes) go through Composio's `google_maps` toolkit, connected with a key from that same project. Composio's toolkit only returns data and can't draw a map. Google's terms forbid showing Places or Routes data on a non-Google map, which rules out the free mix of Google data on MapLibre/OpenStreetMap tiles. We also considered the free Maps Embed API, which shows only one place, search or route at a time with no Markers of our own, and an all-open stack (MapLibre, Nominatim, OSRM), whose place search is too weak for "find me a café nearby". The keys are Jarvis's, not an authorization from the Owner, so the Map is built into Jarvis like Search (ADR 0006), not a Plugin.

## Consequences

- One-time setup outside the repo: a Google Cloud project with billing, the Maps JavaScript, Places, Routes and Geocoding APIs enabled, and two keys. The browser key is limited to the Maps JavaScript API and Jarvis's origin. The server key, given to Composio, is limited to Places, Routes and Geocoding. Google's free monthly usage is expected to cover one Owner.
- The browser key ends up in the page, so its restrictions are what protect it. An origin-restricted key can't be used from Composio's servers, which is why there are two.
- Composio's `google_maps` responses need small mappers to our own Place and Route shapes, as Search's do (ADR 0006).
