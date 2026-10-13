# Spec: Widgets — Weather Widget that Jarvis controls

Status: ready-for-agent

## Problem Statement

Jarvis can talk and, through Plugins, reach outside services, but everything he knows only exists as spoken Replies and lines in the Transcript. The Owner wants glanceable information on screen — starting with the weather — in small floating panels that Jarvis can bring up, put away and rearrange on request, by voice or by typing, and that the Owner can also manage by hand. The Owner wants this built so that future Widgets (more built-in ones, and eventually ones that Plugins bring) can be added without touching the logic that shows, hides and moves them.

## Solution

The Jarvis page gets Widgets: small floating panels that sit in the side margins around the orb and the Transcript. The first is the Weather Widget, which appears top-right the first time the Owner opens Jarvis and shows the current weather for the Owner's location.

The Owner can drag any Widget anywhere on screen, close it with its ✕, and turn Widgets on or off from a "Widgets" group in the sidebar. Jarvis can show, hide and move Widgets when asked ("oculta el tiempo", "pon el tiempo abajo a la izquierda"), and can answer weather questions for the Owner's location or any named city — showing the Weather Widget switched to the place asked about. Which Widgets are Shown, where they are, and their Widget Settings are remembered across Sessions.

Every Widget is an entry in a Widget registry; Jarvis's Widget tools, the sidebar toggles and the on-screen layout are all driven by that registry, so adding a Widget is adding an entry.

## User Stories

### Seeing Widgets

1. As the Owner, I want the Weather Widget to appear in the top-right of the Jarvis page the first time I open Jarvis, so that I see the weather without asking.
2. As the Owner, I want Widgets to float in the side margins and not over the orb or the Transcript when they first appear, so that they never get in the way of talking to Jarvis.
3. As the Owner, I want a future Widget that has no Starting Spot to appear at a random free place in the left or right margin, so that new Widgets don't pile on top of each other.
4. As the Owner, I want Widgets to exist only on the Jarvis page, so that the Plugins page stays uncluttered.
5. As the Owner, I want Widgets to stay inside the visible window when I resize it, so that I never lose one off-screen.
6. As the Owner, I want Widgets on a narrow window to stay where they are, even if they cover part of the chat, so that they behave predictably.

### Managing Widgets by hand

7. As the Owner, I want every Widget to have an always-visible ✕, so that I can close it in one click.
8. As the Owner, I want closing a Widget to Hide it, so that I can bring it back later.
9. As the Owner, I want to drag a Widget by grabbing anywhere on it, so that moving it is easy with a mouse or a finger.
10. As the Owner, I want to drag a Widget anywhere on the screen, including over the chat, so that I decide my own layout.
11. As the Owner, I want clicking the ✕ never to start a drag, so that closing is reliable.
12. As the Owner, I want a "Widgets" group in the sidebar listing every Widget with an on/off toggle, so that I can Show or Hide any Widget without asking Jarvis.
13. As the Owner, I want the sidebar toggles to work from any page, so that I can set things up before going back to Jarvis.
14. As the Owner, I want the sidebar toggles to always reflect what is Shown, including changes Jarvis made, so that the sidebar never lies.

### Remembering

15. As the Owner, I want which Widgets are Shown to be remembered when I reload or come back later, so that a Widget I closed stays closed.
16. As the Owner, I want each Widget's position to be remembered, so that my layout survives reloads.
17. As the Owner, I want Widget Settings (like the Weather Widget's place) to be remembered, so that the Widget looks the same when I come back.
18. As the Owner, I want my conversation still to start fresh on reload, so that only the Widget layout carries over between Sessions.

### Asking Jarvis to manage Widgets

19. As the Owner, I want to say or type "oculta el tiempo" and have Jarvis Hide the Weather Widget, so that I can tidy the screen hands-free.
20. As the Owner, I want to say or type "muéstrame el tiempo" and have Jarvis Show it, so that I can bring it back hands-free.
21. As the Owner, I want to ask Jarvis to move a Widget to a Spot ("arriba a la izquierda", "abajo a la derecha", "a la derecha en medio"), so that I can rearrange the screen by voice.
22. As the Owner, I want a Widget that Jarvis moves to slide smoothly to its new Spot, so that I can follow where it went.
23. As the Owner, I want moving a Hidden Widget to also Show it, so that "pon el tiempo a la izquierda" just works.
24. As the Owner, I want a Widget moved to a Spot already holding another Widget to stack next to it rather than cover it, so that both stay readable.
25. As the Owner, I want Jarvis to confirm what he did in one short spoken sentence, so that I know my request was understood.
26. As the Owner, I want Jarvis to know which Widgets are currently Shown and roughly where, so that he can answer sensibly ("ya lo tienes a la derecha").
27. As the Owner, I want Jarvis to say plainly when I ask for a Widget that doesn't exist, so that he never pretends.
28. As the Owner, I want to ask for several things at once ("oculta el tiempo y …"), so that Jarvis can make more than one Widget change in a Turn.
29. As the Owner, I want Widget changes to happen when Jarvis's Reply arrives, so that what I see matches what he says.
30. As the Owner, I want Widget control to work the same whether I spoke or typed, so that Jarvis behaves consistently.

### The Weather Widget

31. As the Owner, I want the Weather Widget to show the place name, current temperature in °C, a condition icon and text in Spanish, today's high and low, and wind in km/h, so that I get the essentials at a glance.
32. As the Owner, I want the Weather Widget to use my location, so that it shows the weather where I am.
33. As the Owner, I want to be asked for location permission only when the Weather Widget needs it, so that I'm not prompted for nothing.
34. As the Owner, I want the Weather Widget to fall back to a configured city if I deny location, so that it still shows something useful without nagging.
35. As the Owner, I want the Weather Widget to refresh itself every 15 minutes, so that it stays current.
36. As the Owner, I want a loading placeholder while the weather loads, so that the Widget doesn't jump around.
37. As the Owner, I want a one-line "No pude cargar el tiempo" if loading fails, with a retry on the next refresh, so that a hiccup doesn't break the page.

### Asking Jarvis about the weather

38. As the Owner, I want to ask "¿qué tiempo hace?" and hear a short spoken answer for my location, so that I don't have to look at the screen.
39. As the Owner, I want to ask about any named city ("¿y en Londres?"), so that I can check the weather elsewhere.
40. As the Owner, I want to ask about the next few days ("¿lloverá mañana?"), so that I can plan ahead.
41. As the Owner, I want Jarvis's weather answers to work even when the Weather Widget is Hidden, so that the answer never depends on the screen.
42. As the Owner, I want asking about the weather to also Show the Weather Widget, so that I can see the details.
43. As the Owner, I want asking about another city to switch the Weather Widget to that city, so that the screen matches what Jarvis just told me.
44. As the Owner, I want asking about my own place again to switch the Weather Widget back to my location, so that I can return naturally.
45. As the Owner, I want a "📍 Mi ubicación" button on the Weather Widget only while it shows another place, so that I can switch back by hand.
46. As the Owner, I want the Weather Widget to keep showing today's conditions even when I asked about tomorrow, so that the Widget stays simple while Jarvis tells me the forecast.
47. As the Owner, I want Jarvis to say in one sentence when he can't find a place, and leave the Widget unchanged, so that a misheard city doesn't wipe my Widget.
48. As the Owner, I want Jarvis to name the country when a place name is ambiguous ("En Valencia, España, …"), so that I can correct him.
49. As the Owner, I want a weather service failure to be explained in one sentence rather than failing the Turn, so that Jarvis stays usable.

### Future Widgets

50. As the Owner, I want new built-in Widgets to appear in the sidebar, be controllable by Jarvis and be remembered without new control logic, so that Jarvis grows easily.
51. As the Owner, I want Jarvis to Show a Widget when I ask about what it displays, based on that Widget's own description, so that every future Widget gets this behaviour for free.
52. As the Owner, I want Widgets that Plugins bring in the future to run sandboxed and never as imported third-party code, so that my tokens stay safe.

## Implementation Decisions

### Domain

- New glossary terms in `CONTEXT.md`: Widget, Shown / Hidden, Spot, Starting Spot, Widget Setting. Plugins may eventually bundle Widgets.
- A Spot is one of six names: left or right × top, middle or bottom. There is no centre Spot.
- ADR 0002: Jarvis controls Widgets through server-side tools whose effects return alongside the Reply. ADR 0003: Plugin Widgets will be MCP Apps in sandboxed iframes; only built-in Widgets are built now.

### Widget registry

- A single registry lists every Widget. Each entry has: an id, a Spanish display name, a one-line description of what it shows (written for the model), an optional Starting Spot, an optional Widget Settings schema (zod) with defaults, a source marker (built-in; Plugin later), and the component that renders it given its current Widget Settings and a way to update them.
- The registry is the only place a Widget is declared. The sidebar group, the layout, Jarvis's tool descriptions and the Widget changes validation all read from it.
- The Weather Widget entry: Starting Spot right-top; Widget Settings `{ place?: string }`, where an absent place means the Owner's location.

### Widget Board (client)

- A deep, framework-free module that owns the Widget layout: for each Widget, whether it is Shown, its position, and its Widget Settings. It is created with the registry, a storage adapter, the viewport size, and an injectable random source.
- Operations: show (optionally with Widget Settings), hide, move to a Spot, drag to a free position, update Widget Settings, resize the viewport, apply a list of Widget changes, subscribe/snapshot (for `useSyncExternalStore`), and describe the layout for Jarvis.
- First placement: a Widget that has never been placed goes to its Starting Spot, or to a random free place in the left or right margin (beside the centred orb and Transcript column) that doesn't overlap another Shown Widget.
- Positions are stored as fractions of the viewport and clamped so the whole Widget stays inside the viewport on resize.
- Moving to a Spot that already holds a Widget stacks the moved one next to it (below it, or above it at the bottom Spots).
- Widget Settings are validated against the Widget's schema; invalid settings are ignored.
- Persistence: the board saves its whole state to localStorage under one versioned key after every change and loads it at start. A missing, unreadable or wrong-version value falls back to defaults (every Widget Shown at its Starting Spot). Widgets no longer in the registry are dropped; new registry entries get defaults.
- The board's layout description for Jarvis is, for each Widget: id, name, Shown, its Spot (the nearest Spot to its current position), and its Widget Settings.
- One board instance per browser tab, shared by the Jarvis page and the sidebar, so both always agree.

### Widget changes and the Reply contract

- `Brain.reply` changes from returning text to returning `{ text, widgetChanges }`. The request to the Reply endpoint now carries the transcript lines, the Widget layout description, and the Owner's location (coordinates, or none).
- A Widget change is one of: show `{ id, settings? }`, hide `{ id }`, move `{ id, spot }`.
- The session applies the Widget changes to the board as soon as the Reply arrives, before Jarvis starts Speaking. A Turn that fails produces no Widget changes.
- The session gets the board (or a narrow "apply Widget changes" callback) as a new adapter, keeping the session free of React.

### Jarvis's tools for a Turn (server)

- Every Turn, Jarvis gets built-in tools alongside the Plugin tools: `show_widget(id, settings?)`, `hide_widget(id)`, `move_widget(id, spot)`, and `get_weather(place?)`.
- The Widget tools are generated from the registry: the allowed ids, each Widget's description and Widget Settings schema are put in the tool descriptions and input schemas. Each call records a Widget change for the Turn and returns a short confirmation for the model. Unknown ids or invalid settings return an error message for the model instead of throwing.
- The current Widget layout is added to the system prompt each Turn so Jarvis knows what is Shown and where.
- New system prompt rules (Spanish): when the Owner asks about something a Widget shows, also Show that Widget; moving a Hidden Widget Shows it; confirm Widget actions in one short sentence; to point the Weather Widget back at the Owner, Show it with no place.
- Built-in tool failures never fail the Turn: as with Plugins, they turn into a one-sentence explanation by Jarvis.

### Weather

- One server-side weather module wraps Open-Meteo (no API key): geocoding for named places, and the forecast endpoint for current conditions plus a 3-day daily forecast, in °C and km/h, with Spanish place names.
- It resolves a place as follows: a named place goes through geocoding and uses the top result, with the place name and country returned; no place uses the Owner's coordinates sent with the Turn; if there are none, it uses the fallback city from env.
- Results include the resolved place name and country, the current temperature, condition, wind, and today's high/low, plus daily high/low, condition and chance of rain for 3 days. Conditions are mapped from WMO weather codes to Spanish text and an icon in one table, shared by the tool and the Widget.
- "Not found" and "service failed" are distinct results so Jarvis can say the right thing; neither throws out of the tool.
- The Weather Widget gets its data from a small weather endpoint on our server that uses the same module, so there is a single Open-Meteo client. It asks for geolocation when it first renders Shown in a Session, falls back to the env city if denied, refreshes every 15 minutes and when its place changes, and shows loading and error states.
- The fallback city is a new env var, documented next to the others.

### UI

- Widgets render in a layer over the Jarvis page only. Each Widget is a compact card with an always-visible ✕ and is draggable from anywhere on it except the ✕, using pointer events so it works with mouse and touch.
- Jarvis-driven moves animate to the target; the animation is skipped when the Owner prefers reduced motion.
- The sidebar gets a "Widgets" group, shown on every page, with a switch per registry entry bound to the board.
- The "📍 Mi ubicación" button on the Weather Widget clears its place Widget Setting.
- All new UI text is in Spanish. Use the existing `@workspace/ui` components (card, switch, skeleton, button).

## Testing Decisions

- Good tests here exercise a module only through its public interface and assert on behaviour the Owner or Jarvis would notice: what is Shown, where it is, what was persisted, which Widget changes a Turn produced, what Jarvis was told. They don't assert on internal state shape or call order beyond that.
- **Widget Board** (new seam): tested with an in-memory storage adapter, a fixed viewport and a seeded random source. Cover: Starting Spot on first run; random placement in the margins without overlap; show/hide/move/drag; moving a Hidden Widget Shows it; stacking at an occupied Spot; clamping on viewport resize; Widget Settings validation; save after each change and load on start; corrupt or old stored state falls back to defaults; registry additions and removals; layout description with nearest Spot.
- **Jarvis's tools for a Turn** (new seam): the tool factories are tested by calling the tools' execute functions directly, with a test registry and a fake `fetch` returning recorded Open-Meteo payloads. Cover: each Widget tool records the right Widget change; unknown ids and invalid settings produce model-facing errors and no change; `get_weather` with no place uses the Owner's coordinates, then the env city; named place geocoding, not found, and service failure; WMO code mapping. The model itself is not tested.
- **Jarvis Session** (existing seam): the existing session tests are extended with a fake Brain returning Widget changes, asserting they are applied before Speaking, and not applied when the Turn fails.
- Prior art: the existing session tests (fake adapters, deferreds) and the Plugins tests (fakes injected into a factory, in-memory store). Tests run with vitest via the web app's test script.
- No component or browser tests; dragging, the ✕, the sidebar toggles, geolocation and the real Open-Meteo calls are checked by hand against the acceptance criteria.

## Acceptance criteria

- On a fresh browser, the Weather Widget appears in the top-right of the Jarvis page.
- Saying or typing "oculta el tiempo" Hides it; "muéstrame el tiempo" Shows it.
- The ✕ closes it, and it stays closed after a reload.
- "Pon el tiempo abajo a la izquierda" moves it there with an animation.
- "¿Qué tiempo hace en Londres?" gets a spoken answer and Shows the Weather Widget on London; "📍 Mi ubicación" switches it back.
- The sidebar "Widgets" toggle Shows and Hides the Weather Widget and reflects Jarvis's changes.

## Out of Scope

- Widgets brought by Plugins (MCP Apps), and any Widget other than Weather.
- Widgets on pages other than Jarvis.
- Syncing the Widget layout across devices or browsers (it lives in this browser's storage).
- A special layout for small screens (collapsing or hiding Widgets).
- Typing a city into the Weather Widget, or any Widget settings UI other than "📍 Mi ubicación".
- Forecast days on the Weather Widget; the forecast is spoken only.
- Relative moves ("más arriba", "al otro lado") and a centre Spot.
- Resizing Widgets.
- Choosing units (°F, mph).
- Jarvis reading what a Widget displays; his weather knowledge comes only from the weather tool.

## Further Notes

- Widget changes are applied when the full Reply returns, not streamed mid-Turn (ADR 0002). If Replies ever stream, Widget changes can stream with them.
- The step limit for a Reply stays as it is; a weather question plus a Show is two tool calls, well within it.
- Open-Meteo is free for non-commercial use and needs no key; its geocoding returns localized names when asked for Spanish.
