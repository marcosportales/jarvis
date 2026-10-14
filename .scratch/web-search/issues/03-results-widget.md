# 03: The Results Widget shows what a Search found

**What to build:** When a Search returns a list, the Results Widget appears and lays out the results as cards: title, subtitle, the labelled facts, the source, and a link that opens in a new tab. The spoken Reply only sums it up.
- A new built-in Widget in the catalog, `results` ("Resultados"), with no settings, Starting Spot left-top, larger than Weather, and scrolling inside. The Owner and Jarvis can show, hide, move, drag and toggle it like any Widget.
- Its content is not a Widget Setting. The client Session keeps the latest Search Outcome in memory, replaces it when a Reply carries `search`, and keeps it when a Reply doesn't. After a reload the Widget shows "Aún no hay resultados". A Search that found nothing shows a "nothing found" state.
- Turn rule: when the Turn's Search Outcome has more than one result, the Turn adds a `show results` Widget change, unless the model hid the Results Widget in that Turn. Single-fact answers leave the Widget alone.
- Links use `target="_blank"` with `rel="noopener noreferrer"`. Cards without a URL are plain.
- The system prompt tells Jarvis to sum up lists and point at the screen ("te dejo el resto en pantalla").

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Turn test: a Search with several results → a `show results` change. One result or none → no change
- [ ] A Turn test: the model hiding the Results Widget in the same Turn wins over the automatic show
- [ ] Client Session tests: a Reply with `search` replaces the in-memory outcome, and one without keeps it
- [ ] In the running app, a list Search shows the Widget with working links, and a reload shows the empty state with the Widget's position kept
- [ ] Typecheck, lint and the full test suite pass
