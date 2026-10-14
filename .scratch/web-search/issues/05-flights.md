# 05: Jarvis searches flights

**What to build:** "Vuelos de Madrid a Roma el viernes" or "¿cuánto cuesta ir y volver a Lisboa del 3 al 7 de noviembre, dos adultos?" → Jarvis sums up the best options out loud, and the Results Widget lists the flights with airline, times, duration, stops and price in euros.
- A `search_flights` tool: from, to, outbound date, optional return date, adults, children and infants, cabin class, currency. It defaults to `hl=es`, `gl=es`, `EUR` unless the Owner names another currency or country. Its description says how places are given (city names or IATA codes, per ticket 01).
- A flights mapper into the Search Outcome, with a heading like "Vuelos MAD → FCO · vie 16 oct", capped at about 10 results, and with booking tokens dropped.
- The system prompt: an implied departure point ("desde casa", none given) comes from the Owner's Memories. If there isn't one, Jarvis asks once and offers to Remember it.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Mapper tests over the ticket 01 flights fixture
- [ ] A Turn test: the tool sends the expected inputs and defaults to the fake port, and the Reply carries a flights outcome with a `show results` change
- [ ] A Turn test: a named currency overrides the EUR default
- [ ] In the running app, a real flight question gets a spoken summary and flight cards
- [ ] Typecheck, lint and the full test suite pass
