# 01: Weather data for a place

**What to build:** Jarvis's server can answer "what's the weather at this place?" from Open-Meteo. This is the foundation both the Weather Widget and Jarvis's weather answers stand on, and it can be checked on its own by calling the weather endpoint.

- The **weather module** (server-only), the test seam for weather. It's created with an injectable `fetch` and env. Given a place, it resolves it like this: a named place goes through Open-Meteo geocoding, in Spanish, using the top result. Otherwise it uses the Owner's coordinates when given, and otherwise the fallback city from a new env var.
- It returns the resolved place name and country, the current temperature (°C), condition, wind (km/h), today's high/low, and a 3-day daily forecast (high/low, condition, chance of rain).
- "Place not found" and "service failed" are distinct results, never thrown.
- One shared table maps WMO weather codes to Spanish condition text and an icon. The Widget and Jarvis both use it.
- A small **weather endpoint** on our server that takes an optional place or coordinates and returns the module's result as JSON. The Weather Widget will use it.
- Document the fallback-city env var next to the existing ones.

See the spec's "Weather" section. No Widget UI yet.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Weather module tests (Vitest, fake `fetch` returning recorded Open-Meteo payloads) cover: coordinates, then the env fallback city when there are none; named-place geocoding with the country returned; place not found; service failure; WMO code mapping
- [x] Calling the weather endpoint locally returns real current conditions and 3 days for a named city and for coordinates
- [x] Fallback-city env var documented
- [x] Lint, typecheck and tests pass
