# 07: Routes by voice and by hand

**What to build:** The Owner says "¿cómo llego al Prado?" and sees the Route drawn on the Map with its time and distance. Jarvis says them out loud and Shows the Map Widget on its own.
- Jarvis gets `plan_route(to, from?, mode)` over Composio's Routes tool, with a mapper to the spec's Route shape.
- Without `from`, the Route starts at the Turn's coordinates. Without those either, the tool answers the model to ask "¿desde dónde?". "Desde casa" works when Jarvis has a Memory of the Owner's home: the model passes it as `from`.
- The modes are car, walking, public transport and bike ("¿y andando?").
- There's one Route at a time, replacing the old one. Its ends become the Markers, and the view fits the whole Route.
- By hand: a "Cómo llegar" button in a place's details plans a Route there from the Owner's location, and the Expanded Map has a travel-mode switch for the current Route.
- "No route found" and Maps failures answer in Spanish and never fail the Turn.

See `../spec.md` (stories 62–72).

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Mapper tests over the 03 Route fixtures, one per mode, plus the no-route case
- [ ] Turn tests with a fake Maps port:
  - `plan_route` with coordinates gives Map settings with the Route and its two end Markers, plus a `show`
  - without coordinates and `from`, the tool asks
  - a second Route replaces the first
- [ ] Tool test: the layout notice gives the Route's destination, mode and duration, without a polyline
- [ ] In the running app:
  - "¿cómo llego al Prado?" draws the Route and says the time
  - "¿y andando?" changes the mode
  - "Cómo llegar" from a place's details works by hand
  - the mode switch works
- [ ] Typecheck, lint and the full test suite pass
