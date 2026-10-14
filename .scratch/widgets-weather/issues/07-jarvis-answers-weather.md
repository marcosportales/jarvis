# 07: Jarvis answers weather questions

**What to build:** The Owner asks "¿qué tiempo hace?", "¿lloverá mañana?" or "¿y en Londres?", and Jarvis gives a short spoken answer from Open-Meteo, also when the Weather Widget is Hidden. Asking about the weather also Shows the Weather Widget.

- A `get_weather(place?)` tool given every Turn, wrapping the weather module (ticket 01). With no place it uses the Owner's coordinates, which the client now sends with each Turn (from the browser's geolocation when already granted; none otherwise), then the env city.
- "Not found" and "service failed" become model-facing messages so Jarvis explains them in one sentence. For a named place Jarvis says the resolved country ("En Valencia, España, …").
- New Spanish system-prompt rule: when the Owner asks about something a Widget shows (per each Widget's registry description), also Show that Widget. This is generic, not weather-specific.

**Blocked by:** 01, 04

**Status:** done

- [x] "¿Qué tiempo hace?" gets a one-to-three-sentence answer for the Owner's location and Shows the Weather Widget if Hidden
- [x] "¿Qué tiempo hará mañana en Londres?" answers with the forecast and names the country
- [x] An unknown place gets a one-sentence "no encontré ese lugar" style Reply and no Widget change
- [x] A weather service failure is explained in one sentence; the Turn doesn't fail
- [x] Tool tests (fake `fetch`) cover: Owner's coordinates, the env fallback, a named place, not found, service failure
- [x] Lint, typecheck and tests pass

## Comments

Checked against the real model by POSTing to `/api/reply` from a dev server:

- "¿Qué tiempo hace?" with the Widget Hidden answered in two sentences, for the Owner's coordinates when they were sent and for the env city when they weren't, and produced a `show` change for the Weather Widget.
- "¿Qué tiempo hará mañana en Londres?" answered tomorrow's forecast and named "Reino Unido".
- An unknown place got a one-sentence "No encontré…" Reply and no Widget change.
- A failing weather service (forced with an unresolvable fallback city) was explained in one sentence, and the Turn still succeeded.
- Malformed `coords` get a 400.

The browser side, which sends coordinates only when geolocation is already granted, wasn't exercised in a real browser.
