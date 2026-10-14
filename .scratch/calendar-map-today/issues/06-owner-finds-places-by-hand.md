# 06: The Owner finds places by hand and sees their details

**What to build:** In the Expanded Map Widget, the Owner can do by hand what Jarvis does by voice.
- A search box finds places, replacing the Markers just like `find_places`.
- A numbered list beside the map shows each place's name, rating and address.
- Clicking a Marker or a list entry opens a details panel: address, rating, open now, phone, and a website link.
- A "Limpiar mapa" button clears the Markers and the Route.
- Hand actions go through a server route over the same Maps module as Jarvis's tools, then update the Widget Settings. Jarvis sees the result in the next Turn's layout.
- Jarvis gets `place_details(marker | place)`, so "¿el tercero abre ahora?" or "dame el teléfono del segundo" work.

See `../spec.md` (stories 57–60, 73).

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Mapper test over the 03 place-details fixture
- [ ] Turn test: `place_details` for a Marker number answers the model with its details; an unknown number answers in Spanish
- [ ] Test of the server route's handler over a fake Maps port: a search gives Places, and a failure gives an error the Widget can show
- [ ] In the running app:
  - searching by hand fills the list and the Markers
  - clicking a Marker opens its details
  - "Limpiar mapa" clears the map
  - after a hand search, asking Jarvis "¿cuál es el segundo?" is answered right
- [ ] Typecheck, lint and the full test suite pass
