# Spec: Today, Calendar and Map Widgets — the Owner's day, Agenda and places on screen

Status: ready-for-agent

## Problem Statement

The Owner looks at the Jarvis page all day but can't see the date and time on it. The Owner can't see their day, and they can't look at a map. When they ask Jarvis "¿qué tengo el jueves?", Jarvis can't reach their calendar at all. When they ask "¿cómo llego al aeropuerto?" or "busca cafeterías cerca", the best they get is a list of cards in the Results Widget, with no map to look at, no Markers and no Route. They want to work with a map the way they would in Google Maps, both by hand and by talking to Jarvis. They want their Agenda on screen in a form that can later also hold reminders and to-dos: a meeting, the shopping, delivering a product.

## Solution

Three new Widgets:

- The **Today Widget**, built into Jarvis.
  - Shows today's date with its weekday ("martes, 14 de octubre de 2026") and the time as `HH:mm`, 24-hour, for where the Owner is.
  - Behaves like the Weather Widget: Shown, Hidden and moved by the Owner or Jarvis. Not Expandable, no Widget Settings.
  - Takes the right-top Starting Spot. The Weather Widget's Starting Spot moves down to right-middle.
- The **Calendar Widget**, brought by the new **Google Calendar Plugin** (through Composio, read-only).
  - Exists only while that Plugin is Connected.
  - Collapsed, it shows one day's **Agenda**: its **Agenda Items**, today unless Jarvis was asked about another day.
  - Expandable. Expanded, it shows a week, with a switch to a month.
  - Jarvis answers questions about the Owner's Agenda and Shows the Calendar Widget on the day asked about, on its own. It only Expands it when asked.
  - Agenda Items come from Google Calendar today. The Agenda is shaped so reminders or Google Tasks can join later as more sources.
- The **Map Widget**, built into Jarvis. Google Maps throughout, with Jarvis's own keys (ADR 0008).
  - Expandable.
  - The Owner and Jarvis can both find places (which become numbered **Markers**), see a place's details, plan one **Route** by car, on foot, by public transport or by bike, recentre and zoom, and clear the map.
  - Finding places moves from Search to the Map.
  - Jarvis Shows the Map Widget on its own when a Reply is about a place or a way to get somewhere, and Expands it only when asked.
  - Its Markers, Route and view are kept across Sessions until replaced or cleared.

## User Stories

### Today Widget

1. As the Owner, I want a Widget with today's date and weekday in Spanish, so that I always know what day it is without asking.
2. As the Owner, I want the time shown as `HH:mm` in 24-hour form, so that it reads the way I'm used to.
3. As the Owner, I want the time to change exactly when the minute changes, so that the clock is never a minute behind.
4. As the Owner, I want the date to roll over at midnight on its own, so that a page left open overnight is still right in the morning.
5. As the Owner, I want the Today Widget to use my own time zone, so that it shows my time and not the server's.
6. As the Owner, I want the Today Widget to first appear at the top right, above the Weather Widget, so that the two read as one corner about "now".
7. As the Owner who never moved the Weather Widget, I want it to start just below the Today Widget, so that they don't overlap.
8. As the Owner who already placed the Weather Widget, I want it to stay where I put it, so that nothing I arranged moves.
9. As the Owner, I want to show, hide and drag the Today Widget like any other Widget, so that it fits my layout.
10. As the Owner, I want to say "quita la hora" or "pon la fecha abajo a la izquierda" and have Jarvis hide or move the Today Widget, so that I can arrange it by voice.
11. As the Owner, I want the Today Widget to have no expand button, so that I'm never offered something that does nothing.

### Google Calendar Plugin

12. As the Owner, I want Google Calendar in the Marketplace, so that I can let Jarvis see my calendar.
13. As the Owner, I want installing it to go through the same consent flow as Gmail, so that it feels familiar.
14. As the Owner, I want Jarvis to only read my calendar, never create, change or delete anything, so that nothing changes behind my back.
15. As the Owner, I want Reconnect and Uninstall to work for Google Calendar as they do for Gmail, so that I stay in control.

### Calendar Widget: existing only while Connected

16. As the Owner without the Google Calendar Plugin Connected, I want no Calendar Widget anywhere, neither on screen nor in the sidebar toggles, so that I'm never shown a Widget that can't work.
17. As the Owner, I want the Calendar Widget to appear once I connect Google Calendar, so that the Plugin pays off at once.
18. As the Owner, I want the Calendar Widget to disappear if the Plugin breaks or is uninstalled, and to come back where it was when I reconnect, so that I don't lose my layout.
19. As the Owner, I want asking "enséñame el calendario" without the Plugin to get "instala Google Calendar desde el Marketplace", so that I know what to do.

### Calendar Widget: the Agenda

20. As the Owner, I want the Collapsed Calendar Widget to show today's date and today's Agenda Items in time order, so that I see my day at a glance.
21. As the Owner, I want each Agenda Item to show its time (or "todo el día") and its title, so that I know what and when.
22. As the Owner, I want Agenda Items from every calendar I can see in Google Calendar (mine, shared ones, holidays, birthdays), so that nothing is missing.
23. As the Owner, I want each Agenda Item coloured by its calendar, so that I can tell work from personal at a glance.
24. As the Owner, I want Agenda Items that already ended to look faded and the current one to stand out, so that I know where I am in my day.
25. As the Owner, I want a clear "nada para hoy" when the day is empty, so that an empty list doesn't look broken.
26. As the Owner, I want a clear message when the Agenda can't be loaded, so that I don't trust an empty day by mistake.
27. As the Owner, I want the Agenda to refresh on its own every few minutes, so that something I just added in Google Calendar shows up.
28. As the Owner, I want to click an Agenda Item to see its place, description and calendar, so that I don't need to open Google Calendar for the details.
29. As the Owner, I want times shown in 24-hour form in my time zone, so that they match the Today Widget.

### Calendar Widget: Expanded

30. As the Owner, I want the Calendar Widget to be Expandable, so that I can see more than one day.
31. As the Owner, I want the Expanded Calendar to show the week of the day it was showing, Monday first, with each day's Agenda Items, so that I can plan my week.
32. As the Owner, I want to switch the Expanded Calendar between week and month, so that I can look further ahead.
33. As the Owner, I want to step to the previous or next week or month, and back to today, so that I can move around by hand.
34. As the Owner, I want collapsing the Calendar to show the day I was last looking at, so that it stays consistent.

### Jarvis and the Agenda

35. As the Owner, I want to ask "¿qué tengo hoy?", "¿qué tengo el jueves?" or "¿cuándo es la reunión con Ana?" and get a spoken answer from my calendar, so that I don't have to look.
36. As the Owner, I want Jarvis to Show the Calendar Widget on the day I asked about when it reads my Agenda, so that I can see what it's talking about.
37. As the Owner, I want Jarvis never to Expand the Calendar on its own, so that the page isn't taken over without my asking.
38. As the Owner, I want to say "amplía el calendario" or "enséñame el mes" and have Jarvis Expand it in that view, so that I can do it by voice.
39. As the Owner, I want Jarvis to know which day and view the Calendar Widget is showing, so that "¿y el día siguiente?" works.
40. As the Owner, I want every page load to start the Calendar back on today, so that a reload never leaves me looking at last Thursday.
41. As the Owner, I want Jarvis to say it can't add events or reminders yet when I ask, so that I'm not misled.
42. As the Owner, I want a Calendar problem never to break a Turn, so that Jarvis still answers and tells me what went wrong.

### Map Widget: the map

43. As the Owner, I want a Map Widget with a live Google map, so that I can look at places.
44. As the Owner, I want to drag and zoom the map with the mouse in both the Collapsed and Expanded Widget, so that it feels like Google Maps.
45. As the Owner, I want my own location shown as a dot when the browser has permission, so that I know where I am on the map.
46. As the Owner, I want the map to start centred on where I am, or on Jarvis's fallback city, so that it is useful right away.
47. As the Owner, I want the Map Widget to first appear at the bottom left, so that it doesn't cover the other Widgets.
48. As the Owner, I want the Map Widget to be Expandable, so that I can see a big map with room for lists and details.
49. As the Owner, I want the map's view, Markers and Route kept across reloads and Sessions until replaced or cleared, so that I can pick up where I left off.
50. As the Owner, I want a clear message in the Map Widget if the map isn't set up or can't load, so that a blank box doesn't confuse me.

### Map Widget: finding places

51. As the Owner, I want to say "busca cafeterías cerca" or "¿dónde está el Museo del Prado?" and see the places as numbered Markers, so that I can see where they are.
52. As the Owner, I want a new search to replace the previous Markers, so that the map shows only what I last asked for.
53. As the Owner, I want the map to fit all the Markers in view after a search, so that I don't have to look for them.
54. As the Owner, I want Jarvis to Show the Map Widget on its own when it finds places, so that I see them without asking.
55. As the Owner, I want Jarvis to sum up out loud what it found ("he encontrado cinco; la mejor valorada es…"), so that I can listen instead of reading.
56. As the Owner, I want "cerca" to mean near me when Jarvis knows where I am, and Jarvis to ask "¿cerca de dónde?" when it doesn't, so that results make sense.
57. As the Owner, I want a search box in the Expanded Map Widget, so that I can search by hand.
58. As the Owner, I want a numbered list of the found places beside the Expanded map, with name, rating and address, so that I can compare them.
59. As the Owner, I want clicking a Marker or a list entry to show its details (address, rating, open now, phone, website link), so that I can decide.
60. As the Owner, I want to ask "¿cuál tiene mejor nota?", "¿el tercero abre ahora?" or "dame el teléfono del segundo", so that I can talk about the Markers by number or name.
61. As the Owner, I want place searches to show up on the Map and no longer in the Results Widget, so that each thing has one clear home.

### Map Widget: Routes

62. As the Owner, I want to say "¿cómo llego al Prado?" and see the Route drawn on the map with its time and distance, so that I know how to get there.
63. As the Owner, I want a Route without a starting place to start where I am, and Jarvis to ask "¿desde dónde?" when it doesn't know, so that I don't have to say it every time.
64. As the Owner, I want "desde casa" to use my home when Jarvis has a Memory of it, so that I don't have to spell out my address.
65. As the Owner, I want to choose car, walking, public transport or bike ("¿y andando?"), so that I can compare ways to go.
66. As the Owner, I want Jarvis to tell me the time and distance out loud, so that I don't need to look.
67. As the Owner, I want a "Cómo llegar" button on a place's details that plans a Route there from where I am, so that I can do it by hand.
68. As the Owner, I want a travel-mode switch on the Expanded Map's Route, so that I can change it by hand.
69. As the Owner, I want one Route at a time, a new one replacing the old, so that the map stays readable.
70. As the Owner, I want the Route's start and end shown as Markers, so that I can see both ends.
71. As the Owner, I want the map to fit the whole Route in view, so that I see it from end to end.
72. As the Owner, I want Jarvis to Show the Map Widget on its own when it plans a Route, so that I see it without asking.

### Map Widget: tidying and moving around

73. As the Owner, I want to say "quita los marcadores" or "limpia el mapa", or press a button in the Expanded Map, to clear the Markers and the Route, so that I can start again.
74. As the Owner, I want to say "centra el mapa en Sevilla" or "acércate" and have the map move, so that I can explore by voice.
75. As the Owner, I want to say "amplía el mapa" and have Jarvis Expand it, but never Expand it on its own, so that the page isn't taken over without my asking.
76. As the Owner, I want Jarvis to know what's on the map (numbered Markers and the Route), so that its answers about the map are right.
77. As the Owner, I want a Map problem never to break a Turn, so that Jarvis still answers and tells me it couldn't search the map.

### Layout

78. As the Owner, I want the Calendar Widget to first appear at the bottom right, so that every Widget has its own place.
79. As the Owner, I want the new Widgets to look like the existing ones and follow the same Show, Hide, move and Expand rules, so that nothing new needs learning.

## Implementation Decisions

- **Domain terms** are in `CONTEXT.md`:
  - New: Today Widget, Agenda, Agenda Item, Calendar Widget, Map Widget, Marker, Route.
  - Updated: Plugin (may bring Widgets), Widget (built-in or Plugin-brought), Expandable, Starting Spot.
- **ADRs:**
  - 0007: Plugin Widgets are our own components, superseding 0003.
  - 0008: the Map is Google Maps throughout, with two keys from our own Cloud project.

### Widget catalog and Board

- Catalog entries:
  - **Today**: `today`, "Hoy", Starting Spot right-top, no settings, not Expandable.
  - **Weather**: Starting Spot changes to right-middle. A saved position still wins, so only an Owner who never placed it sees it move.
  - **Map**: `map`, "Mapa", left-bottom, about 336×300, Expandable, Map settings.
  - **Calendar**: `calendar`, "Calendario", right-bottom, about 300×320, Expandable, Calendar settings.
- `WidgetSource` becomes `"built-in" | "plugin"`. A Plugin Widget's entry names the Plugin that brings it. The Calendar's names the Google Calendar Plugin.
- **Available Widgets:** the Board learns which Widgets are available right now (built-in ones always; Plugin ones only while their Plugin is Connected).
  - An unavailable Widget is not rendered, not in the sidebar toggles, and left out of `describeLayout()`.
  - Show, move and expand on it do nothing.
  - Its saved state (position, settings) is **kept**, not dropped like an unknown id. So it comes back where it was.
  - The page gets the Connected Plugin ids from the server when it renders and passes them in. A Plugin changing state while the page is open shows up on the next page load. That's enough, because Install and Uninstall already navigate.
- **Settings reset on load:** a catalog entry may name Widget Settings that every page load drops, the same rule as "every page load starts Collapsed". The Calendar's `day` is one. Its `view` is kept.
- **Widget changes** gain `{ type: "settings"; id; settings }`. It replaces a Widget's settings without Showing it, applied in order with the others. The Turn uses it for the Map, so a Reply can update the map even when the model Hid it in the same Turn.

### Map

- **Maps port** over Composio's `google_maps` toolkit. It runs one tool with Jarvis's server key connection and returns raw `data`, like the Search port. The tools:
  - text and nearby search, with a field mask that includes location
  - place details
  - Routes (`GET_ROUTE`), with an encoded polyline
  - geocoding, to turn a place name into a point for "centra en Sevilla"

  Slugs, the toolkit version and fixtures are confirmed in the first Map ticket.
- **Mappers** turn the responses into our own shapes. The model sees these and the Widget renders them:
  - **Place**: id, name, address, location, rating, rating count, open now, phone, website.
  - **Route**: from and to Places, travel mode, duration, distance, polyline.
- **Map settings** (Widget Settings, kept in the Board's storage):
  - `view`: centre and zoom.
  - `markers`: numbered Places.
  - `route`: a Route, at most one.

  It's validated by a schema in the catalog. Markers hold only what the Widget and Jarvis need. Details are fetched on demand.
- **Jarvis's map tools** start from the current Map settings in the layout sent with the Turn. Within a Turn they apply in order, and the latest Map settings come out of the Turn. Built in, not a Plugin:
  - `find_places(query, near?)`: replaces the Markers and fits the view.
  - `place_details(marker | place)`.
  - `plan_route(to, from?, mode)`:
    - `from` defaults to the Owner's coordinates when the Turn has them.
    - Without coordinates or a `from`, the tool answers the model to ask "¿desde dónde?".
    - The result replaces the Route, and its ends become the Markers.
  - `center_map(place | marker, zoom?)`.
  - `clear_map()`.

  Each answers the model with a short summary, not raw data. A failure answers in Spanish and never fails the Turn.
- **Turn rule:** if the map tools changed the Map settings, the Reply carries a `settings` change for the Map, plus a `show` unless the model already did something with the Map Widget. This mirrors the Results and Browser rules. Never `expand`.
- **Layout notice:** for the Map, the numbered Markers (name, address) and the Route (to, mode, duration). It is not the raw settings, so polylines never reach the model.
- **Search:** `search_places`, the `COMPOSIO_SEARCH_GOOGLE_MAPS` slug and the `places` Search kind are removed. The system prompt says places and ways to get somewhere go to the Map.
- **Map Widget component:**
  - Draws a Google map with the Maps JavaScript API and the browser key from env, using Google's own loader or React bindings.
  - Renders the Markers, the Route polyline and the Owner's location dot.
  - Writes the view back to its settings when the Owner pans or zooms, debounced.
  - Expanded: a search box, the numbered list, the details panel with "Cómo llegar", a travel-mode switch and "Limpiar mapa".
  - Hand actions go through a server route over the same Maps module as Jarvis's tools, then update the Widget Settings. There's one path for data.
  - Without the browser key it shows "mapa sin configurar". Without the Composio connection, searches fail with a message and the map still draws.
- **Setup** (human, outside the repo):
  - A Google Cloud project with billing, with the Maps JavaScript, Places (New), Routes and Geocoding APIs.
  - A browser key, limited by origin and to the Maps JavaScript API.
  - A server key, limited by API, registered in Composio as a `google_maps` connection.
  - Two env vars: the public browser key and the Composio connection id.

### Calendar

- **Google Calendar Plugin** catalog entry:
  - Composio toolkit `googlecalendar`.
  - Read-only allowlist: events list and get, find event, list calendars, free/busy.
  - A flag saying its tools are **not** offered to the model over MCP.
- The Plugins module gains `connectedPluginIds()`. `toolsForTurn()` also reports the Connected Plugin ids, so the Turn knows whether the Calendar is there without a second Composio call.
- The Composio port gains `execute(slug, args)` for the Owner's connected account. The Agenda module uses it.
- **Agenda module:** `agendaFor(from, to)` returns `{ status: "ok", items: AgendaItem[] } | { status: "failed" }`.
  - It reads every calendar the Owner has selected in Google Calendar.
  - Recurring events come expanded into single occurrences.
  - Items are in start order, in the Owner's time zone.
- **AgendaItem** shape: id, kind (`"event"` only for now; later `"reminder"`, `"to-do"`), source (`"google-calendar"`), title, start, end, all-day, place, description, calendar name, calendar colour. Adding a source later means a new reader that produces AgendaItems, with no change to the Widget or `read_agenda`.
- **Mapper** from Composio's event and calendar list responses to AgendaItems, with recorded fixtures.
- **Calendar settings:**
  - `day`: an ISO date, defaulting to today, dropped on every load.
  - `view`: `"week" | "month"`, defaulting to week, kept.
- **`read_agenda(from, to)`** is built into Jarvis and offered only while the Plugin is Connected. It answers the model with compact Agenda Items.
- **Turn rule:** when `read_agenda` ran, the Reply Shows the Calendar Widget with `day` set to the first day read, unless the model already did something with it. Never `expand`.
- **Layout notice:** the Calendar's day and view.
- While the Plugin isn't Connected, the Turn adds a notice: the Calendar exists in the Marketplace but isn't Connected. Jarvis tells the Owner to install it there.
- The system prompt keeps "no ofrezcas recordatorios, que no puedes poner". It adds that Jarvis can read the Agenda but not change it.
- **Calendar Widget component:**
  - Fetches the Agenda for what it shows from a server route over the Agenda module, and refreshes every 5 minutes while Shown.
  - Collapsed: the day's list.
  - Expanded: a week grid (Monday first) or a month grid, with previous, next and today controls, and a details popover per item.
  - Distinct loading, empty and failed states.

### Today

- **Today Widget component:**
  - Formats with the `es-ES` locale in the browser's time zone: weekday, day, month, year; then `HH:mm` with `hourCycle: "h23"`.
  - The text comes from a small pure formatting function.
  - It re-renders on a timer aligned to the next minute boundary.
  - No server code. Jarvis already gets the current date and time each Turn.

## Testing Decisions

- Good tests check what the Owner and Jarvis get:
  - the Reply's text-independent outputs (Widget changes, settings)
  - what the tools answer the model
  - the Board's snapshot and `describeLayout()`
  - what mappers turn a recorded response into

  They don't check rendering, CSS or how Google's map is driven.
- **Main seam: the Turn** (`createTurns` with a mock model and fakes), as in the existing Turn tests. New deps are a fake Maps port and a fake Agenda over fixtures. Cases:
  - `find_places` → a `settings` change with numbered Markers plus a `show` for the Map; no `expand`
  - the model hiding the Map in the same Turn keeps the `settings` change and drops the `show`
  - `plan_route` without coordinates or `from` answers to ask; with coordinates, it uses them
  - several map tools in one Turn compose, starting from the layout's Map settings
  - a failing Maps port answers the model and the Turn still replies
  - `read_agenda` → `show` of the Calendar with `day`; not offered when Google Calendar isn't Connected, and the notice is there instead
  - a failing Agenda answers the model and the Turn still replies
  - Google Calendar's raw tools never reach the model
  - `search_places` is gone
- **Second seam: the Widget Board**, the existing Board tests with fake storage:
  - an unavailable Plugin Widget isn't in the snapshot or `describeLayout()`, and ignores show, move and expand
  - its saved position comes back once it's available
  - `settings` changes apply in order
  - Calendar `day` is dropped on load and `view` kept
  - Today starts at right-top and Weather at right-middle when nothing is saved; a saved Weather position wins
- **Third seam: the Widget tools and layout notice**, the existing tool tests:
  - the notice lists Markers and the Route, but never a polyline
  - the notice gives the Calendar's day and view
  - unavailable Widgets are left out of the tool descriptions
- **Mappers**, pure, over fixtures recorded in the confirming tickets, like the Search mapper tests:
  - Places, Routes and geocoding
  - Agenda Items: all-day, recurring, multiple calendars, colours, time zones
- **Plugins** (existing tests): Google Calendar in the Marketplace states; `connectedPluginIds()`; its tools excluded from `toolsForTurn()`.
- **Today:** the pure formatting function, tested with fixed dates and time zones (midnight, single-digit hours, the weekday in Spanish).
- **Running the app** (headless Chrome, as before):
  - each Widget at its Starting Spot
  - the map draws, pans and zooms
  - finding places and Routes by voice and by hand
  - expanding Map and Calendar
  - the Calendar appearing after connecting
  - a reload resetting the Calendar's day
  - the clock turning over a minute

## Out of Scope

- Creating, changing or deleting calendar events. Reminders Jarvis sets itself, Google Tasks, and notifications ("en 10 minutos tienes…"). The Agenda shape is ready for them.
- Street View, live turn-by-turn navigation, live traffic, saving places to the Owner's Google account, multi-stop Routes or Route optimisation.
- Showing another city's time in the Today Widget, or any Today Widget Settings.
- Jarvis or a Widget Expanding on its own.
- A "Google Maps" Plugin in the Marketplace.
- Plugin Widgets as MCP Apps (ADR 0003, superseded).
- Live Plugin state changes on an open page (the next load picks them up).

## Further Notes

- Decisions come from the grilling session on 2026-10-14 and are recorded in `CONTEXT.md` and ADRs 0007 and 0008.
- Google's terms forbid drawing Places or Routes data on a non-Google map (ADR 0008). Don't swap in MapLibre, Leaflet or OSM tiles to save the key setup.
- Composio's `google_maps` toolkit costs aren't documented. Google bills Places and Routes per call above its free monthly usage. Field masks should ask only for the fields we map.
- A Widget change from Jarvis applies when the Reply arrives (ADR 0002), so a found place appears on the map with the Reply, not mid-Turn.
- The Weather Widget's Starting Spot change only affects an Owner whose Board storage has never saved a Weather position.
