# 09: A country code picks the right city

**What to build:** A place written as `Cordoba,ES` (a name, a comma, then a two-letter ISO 3166-1 country code) finds that city in that country. This applies to the fallback city and to any place Jarvis names.

**Bug it fixes:** With `JARVIS_WEATHER_FALLBACK_CITY=Cordoba,ES`, Jarvis Health showed "Tiempo: no responde" even though the Weather Widget showed live weather:

- The Weather Widget uses the Owner's coordinates, so it never geocodes. The Health probe asks for the fallback city, so it does.
- Open-Meteo geocoding does not understand `Name,CC`. It answered `200` with no `results`, and a fallback city that isn't found counts as the service failing, so Health reported "no responde".
- Plain `Cordoba` is no fix. Open-Meteo puts the most populated match first, so it resolves to Córdoba, Argentina (-31.41, -64.19), not Córdoba, Spain (37.89, -4.77).

**Fix:** The weather module's geocoding splits a trailing `, CC` off the name and sends it as Open-Meteo's `countryCode` filter (upper-cased). Anything else, e.g. `Washington, D.C.`, is sent unchanged. The README documents the format next to the env var.

**Blocked by:** None

**Status:** done

- [x] Weather module tests cover: env city `Cordoba,ES` geocodes `name=Cordoba&countryCode=ES`; a named `Córdoba, es` gets `ES`; plain names and non-code suffixes send no country code
- [x] `name=Cordoba&countryCode=ES` against the real Open-Meteo returns Córdoba, Spain
- [x] Fallback-city format documented in the README
- [x] Lint, typecheck and tests pass
