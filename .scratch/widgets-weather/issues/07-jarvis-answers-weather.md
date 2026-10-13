# 07: Jarvis answers weather questions

**What to build:** The Owner asks "¿qué tiempo hace?", "¿lloverá mañana?" or "¿y en Londres?", and Jarvis gives a short spoken answer from Open-Meteo, also when the Weather Widget is Hidden. Asking about the weather also Shows the Weather Widget.

- A `get_weather(place?)` tool given every Turn, wrapping the weather module (ticket 01). With no place it uses the Owner's coordinates, which the client now sends with each Turn (from the browser's geolocation when already granted; none otherwise), then the env city.
- "Not found" and "service failed" become model-facing messages so Jarvis explains them in one sentence. For a named place Jarvis says the resolved country ("En Valencia, España, …").
- New Spanish system-prompt rule: when the Owner asks about something a Widget shows (per each Widget's registry description), also Show that Widget. This is generic, not weather-specific.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] "¿Qué tiempo hace?" gets a one-to-three-sentence answer for the Owner's location and Shows the Weather Widget if Hidden
- [ ] "¿Qué tiempo hará mañana en Londres?" answers with the forecast and names the country
- [ ] An unknown place gets a one-sentence "no encontré ese lugar" style Reply and no Widget change
- [ ] A weather service failure is explained in one sentence; the Turn doesn't fail
- [ ] Tool tests (fake `fetch`) cover: Owner's coordinates, the env fallback, a named place, not found, service failure
- [ ] Lint, typecheck and tests pass
