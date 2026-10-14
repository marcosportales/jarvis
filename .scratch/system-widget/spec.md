# Spec: System Widget — how the computer is doing and whether Jarvis works

Status: ready-for-agent

## Problem Statement

The Owner runs Jarvis on their own computer, but the Jarvis page doesn't show how busy that computer is (CPU, RAM) or how much battery it has left. When something inside Jarvis breaks, the Owner only finds out by trying: a Search that answers "no responde", a Reply that never comes, a voice that stays silent. The page never says whether Jarvis as a whole is working, which part is failing, or whether it's worth trying again. They also can't just ask Jarvis "¿cuánta batería me queda?" or "¿está todo funcionando?".

## Solution

A new built-in Widget, the **System Widget** ("Sistema"):

- It shows how busy the computer Jarvis runs on is right now: CPU %, RAM used out of the total, and, if the computer has a battery, its % and whether it's charging. Each has a small bar.
- The numbers refresh about every 2 s, but only while the Widget is Shown.
- It carries a **Jarvis Health** button. The button shows Working / Limited / Down ("Funcionando" / "Limitado" / "Caído") as a coloured dot and a word.
  - Clicking it opens a list of Jarvis's parts, each with its own level and a one-line reason when it's failing, and re-checks right away.
- Health is kept current two ways:
  - Free probes run about every 60 s while the Widget is Shown, and on click. A probe never makes a paid model or speech call.
  - A part that fails during real use is marked failing at once.
- It behaves like the other Widgets. The Owner and Jarvis can Show, Hide and move it. It isn't Expandable and has no Widget Settings.
- It first appears directly below the Weather Widget, wherever Weather is at that moment. If Weather is Hidden, or there's no room under it, it falls back to right-middle. After that its saved place wins.
- Jarvis can read it. It answers questions about the computer and about whether Jarvis is working, and Shows the System Widget on its own when it does. It never brings these things up unasked.

## User Stories

### The System Widget on screen

1. As the Owner, I want a Widget showing my computer's CPU use as a percentage with a bar, so that I can see at a glance whether it's busy.
2. As the Owner, I want it to show RAM used out of the total (e.g. "11,2 de 16 GB") with a bar, so that I know how much memory is left.
3. As the Owner with a laptop, I want it to show the battery % with a bar and whether it's charging, so that I know whether to plug in.
4. As the Owner with a desktop, I want no battery row at all, so that I'm not shown something that doesn't apply.
5. As the Owner, I want the numbers to refresh about every 2 seconds, so that they feel live.
6. As the Owner, I want the Widget to stop measuring while it's Hidden, so that a Widget I'm not looking at costs nothing.
7. As the Owner, I want the numbers to be for the whole computer, not just Jarvis, so that they match what my system monitor says.
8. As the Owner, I want numbers and units in Spanish style (decimal comma, "GB", "%"), so that it reads like the rest of Jarvis.
9. As the Owner, I want the System Widget to look like the Today and Weather Widgets, so that the page stays consistent.

### Where it appears

10. As the Owner, I want the System Widget to first appear directly below the Weather Widget, wherever I've put Weather, so that my "right now" Widgets sit together.
11. As the Owner whose Weather Widget is Hidden, I want the System Widget to first appear at the right-middle Spot instead, so that it still finds a sensible place.
12. As the Owner whose Weather Widget is so low there's no room below it, I want the System Widget to fall back to the right-middle Spot, clear of the other Widgets, so that it's never pushed off screen or on top of another.
13. As the Owner, I want the System Widget to stay where I or Jarvis put it once moved, and its Shown or Hidden choice kept across Sessions, so that it behaves like every other Widget.
14. As the Owner who already arranged the other Widgets, I want none of them to move when the System Widget arrives, so that my layout survives.

### Showing, hiding and moving

15. As the Owner, I want to show, hide and drag the System Widget, and toggle it in the sidebar, like any other Widget, so that nothing new needs learning.
16. As the Owner, I want to say "quita el monitor del sistema" or "pon el sistema abajo a la izquierda" and have Jarvis hide or move it, so that I can arrange it by voice.
17. As the Owner, I want the System Widget to have no expand button, and Jarvis to say it can't be enlarged if I ask, so that I'm never offered something that does nothing.

### Jarvis Health

18. As the Owner, I want a button on the System Widget showing whether Jarvis is Working, Limited or Down, so that I know at a glance whether Jarvis can help me right now.
19. As the Owner, I want Working to be green, Limited amber and Down red, each with its word, so that it reads without colour too.
20. As the Owner, I want Down to mean I can't hold a Turn because understanding, thinking, speaking or remembering has failed, so that red always means "Jarvis can't talk to you".
21. As the Owner, I want Limited to mean Jarvis still talks but an ability fails (Search and Plugins, the weather or Browse), so that I know what to expect.
22. As the Owner, I want clicking the button to show each of Jarvis's parts with its own level, so that I can see exactly what's wrong.
23. As the Owner, I want a failing part to show a one-line reason in Spanish ("falta la clave", "no responde", "falló hace 2 min"), so that I know whether it's my setup or the service.
24. As the Owner, I want clicking the button to re-check right away, so that I can confirm a fix without waiting.
25. As the Owner, I want Health re-checked about every minute while the Widget is Shown, so that it stays current on its own.
26. As the Owner, I want checks never to cost me model or speech usage, so that keeping an eye on Jarvis is free.
27. As the Owner, I want a part that just failed during real use (a Search, a Reply, a transcription) to show as failing straight away, so that the button doesn't say "Funcionando" right after something broke.
28. As the Owner, I want a part that works again, whether a probe or a real use succeeded, to go back to Working, so that a passing hiccup doesn't stay red.
29. As the Owner, I want my individual Plugins (e.g. Gmail needing a reconnect) not to count toward Health, so that Health is about Jarvis itself and the Marketplace stays the place for Plugins.
30. As the Owner, I want the System Widget to say "No se puede contactar con Jarvis" and show Down when Jarvis's server can't be reached, so that a frozen Widget doesn't look like everything's fine.
31. As the Owner, I want a part that isn't set up (e.g. no Composio key) to show as failing with "sin configurar", so that I know what to add to my setup.

### Jarvis and the System Widget

32. As the Owner, I want to ask "¿cuánta batería me queda?", "¿cómo va la memoria?" or "¿está muy cargado el ordenador?" and get a spoken answer, so that I don't have to look.
33. As the Owner, I want to ask "¿está todo funcionando?" or "¿por qué no me busca nada?" and have Jarvis tell me its Health and which part fails, so that I understand what's going on.
34. As the Owner, I want Jarvis to Show the System Widget on its own when it answers about the computer or its Health, so that I can see what it's talking about.
35. As the Owner, I want Jarvis never to mention the battery, CPU, RAM or Health unless I ask, so that it doesn't nag me.
36. As the Owner on a computer without a battery, I want Jarvis to say it has none when I ask about the battery, so that it never makes a number up.
37. As the Owner, I want a problem reading the computer or checking Health never to break a Turn, so that Jarvis still answers and tells me it couldn't check.

## Implementation Decisions

- **Domain terms** are in `CONTEXT.md`:
  - New: System Widget, Jarvis Health, Working / Limited / Down.
  - Updated: Starting Spot (may be "directly below another Widget", with a Spot to fall back to).
- No ADR. Every decision here is cheap to reverse.

### Widget catalog and Board

- **Catalog entry:**
  - `system`, "Sistema", built-in, not Expandable, no Widget Settings.
  - Its description for the model names CPU, RAM, battery and Jarvis Health.
  - Its size: the usual width, tall enough for three rows plus the Health button without scrolling.
- **Starting place below another Widget:**
  - A catalog entry may name another Widget to start directly below, plus a Starting Spot to fall back to. The System Widget names `weather`, with right-middle as fallback.
  - On first placement the Board puts it under that Widget's current place: same left edge, the usual stack gap below.
  - It uses the fallback Spot (stacked clear of others, like any Starting Spot) when that Widget is Hidden, isn't placed, or there's no room below it within the viewport.
  - Ordering: saved Widgets first, then Widgets with a Starting Spot, then Widgets starting below another, then random ones. That way the Widget it hangs from is already placed.
  - A saved position always wins, as today.

### Machine readings

- A **Machine module**, server-only, reads the computer Jarvis runs on: `read(): Promise<MachineReading>`.
  - **CPU:** whole-machine busy % since the previous reading, from the OS's CPU time counters. On the first call it takes two samples a short moment apart, so it never returns a blank.
  - **RAM:** total and used bytes, where used is total minus what the OS reports as available (not merely free), so it matches system monitors.
  - **Battery:** on Linux, read from the power-supply entries the kernel exposes (capacity %, and status: charging, discharging, full or not charging).
    - No battery entry → `battery: null`.
    - On other OSes, `null` for now.
  - The parsing of the OS's raw text (CPU counters, battery entries) is pure functions over strings, tested with fixtures. Reading the files is a thin shell around them.
- **MachineReading** shape: `{ cpu: { percent }, memory: { usedBytes, totalBytes }, battery: { percent, charging } | null, at }`.

### Jarvis Health

- A **Health module**, server-only and process-wide (one per server, like the other `get…()` singletons):
  - `report(part, outcome)`: a real use succeeded, or failed with a reason. Called from the places listed below.
  - `current({ recheck? }): Promise<HealthReport>`: returns the latest Health. It re-runs the probes when the last probe run is older than ~60 s, or when `recheck` is set.
    - Concurrent calls share one probe run.
    - No server timer: probes only run because the Widget (or Jarvis's tool) is asking, so a Hidden Widget costs nothing.
  - Each part's level is its newest information, whether that's a probe result or a reported real use.
- **Parts** and what each counts toward:

  | Part | Spanish label | Essential (Down) or not (Limited) | Probe |
  | --- | --- | --- | --- |
  | Understanding | Entender (transcripción) | essential | Nan model list lists the transcription model |
  | Thinking | Pensar (modelo) | essential | Nan model list lists the chat model |
  | Speaking | Hablar (voz) | essential | Nan model list lists the speech model |
  | Remembering | Memoria (base de datos) | essential | a trivial query on the local database |
  | Search and Plugins | Búsqueda y Plugins | Limited | a cheap authenticated Composio call |
  | Weather | Tiempo | Limited | the weather service answers for the fallback city |
  | Browse | Navegador | Limited | none of its own: follows Composio's probe, plus reported real use |

  - One request to Nan's model list serves the first three probes.
  - A missing key or env var fails the part with "sin configurar" without calling anything.
  - When the Map Widget ships (spec `calendar-map-today`), "Mapa" joins as a Limited part, probed by checking that its keys are set. Adding a part is one entry in the parts list.
- **Overall level:** Down if any essential part fails; else Limited if any other part fails; else Working.
- **HealthReport** shape: `{ level, parts: { id, label, level, reason?, since? }[], checkedAt }`. `level` per part is just `"working" | "failing"`; the overall is `"working" | "limited" | "down"`.
- **Where real uses are reported:**
  - The Turn reports Thinking: success when the model replied, failure when generating threw. It also reports Remembering when saving the Turn fails, and passes the Health reporter into the weather, Search and Browse tools so their `failed` outcomes and successes are reported.
  - The transcription and speech routes report Understanding and Speaking.
  - Reporting never throws and never slows a Turn.

### Server route and the Widget

- **`GET /api/system`** answers `{ machine: MachineReading, health: HealthReport }`.
  - `?recheck=1` forces a Health probe run.
  - A failing machine read answers `machine: null` alongside Health; it doesn't fail the route.
- **System Widget component:**
  - Polls the route about every 2 s while Shown, and stops while Hidden.
  - Renders CPU, RAM and (when present) battery rows with bars, plus the Health button.
  - The button opens a popover with the parts list and requests `?recheck=1`.
  - If the route can't be reached, it shows "No se puede contactar con Jarvis" with the Health button at Down, and keeps retrying.
  - Formats with `es-ES` (decimal comma). GB use one decimal.

### Jarvis's tool and the Turn

- **`get_system_status()`** is built into Jarvis. It answers the model in plain Spanish lines:
  - CPU %, RAM used / total, the battery (or "este ordenador no tiene batería")
  - Health overall plus any failing part with its reason

  A failing read answers that it couldn't check, and never fails the Turn. It uses the Health module's cached report (no forced recheck), so asking doesn't trigger probes more than once a minute.
- **Turn rule:** when `get_system_status` ran, the Reply Shows the System Widget, unless the model already did something with it this Turn. Never `expand`. This mirrors the Browser Widget rule.
- **System prompt:** for the computer's load, battery or whether Jarvis works, use `get_system_status`, never guess. Don't bring them up unless asked.
- The layout notice needs nothing new. The System Widget has no settings, and Jarvis reads it through the tool.
- **Turn deps** gain `machine: Pick<Machine, "read">` and `health: Pick<Health, "current" | "report">`.

## Testing Decisions

- Good tests check what the Owner and Jarvis get:
  - the Reply's Widget changes
  - what the tool answers the model
  - the Board's snapshot
  - the HealthReport for given probe and report outcomes
  - what the parsers turn recorded OS text into

  They don't check rendering, CSS or polling timers.
- **Main seam: the Turn** (`createTurns` with a mock model and fakes), as in the existing Turn tests. New deps are a fake Machine and a fake Health. Cases:
  - `get_system_status` → a `show` for `system`; the model hiding it in the same Turn wins; no `expand`
  - the tool's answer with and without a battery, and with a failing part named
  - a failing Machine read answers the model and the Turn still replies
  - Thinking is reported as working after a Reply, and as failing when the model throws
  - a weather or Search `failed` outcome reports that part as failing
- **Second seam: the Health module**, with fake probes, a fake clock and fake env. Cases:
  - all probes pass → Working
  - a Limited part fails → Limited; an essential one fails → Down
  - a missing key → "sin configurar" without calling the probe
  - a reported failure overrides an older passing probe, and a later success clears it
  - probes re-run only after ~60 s or on `recheck`
  - concurrent `current()` calls share one probe run
  - a probe that throws or hangs past a timeout counts as failing, never as an exception
- **Third seam: the Widget Board**, the existing Board tests with fake storage. Cases:
  - with empty storage, System starts directly below Weather
  - with Weather saved elsewhere (e.g. under Today at right-top, as on the Owner's profile), System starts below it there
  - Weather Hidden, or no room below it → right-middle, clear of others
  - a saved System position wins
  - no other Widget moves when System is added to an existing layout
- **Widget tools** (existing tool tests): `system` appears in Jarvis's Widget tools and isn't in the Expandable list.
- **Machine parsers**, pure, over fixtures recorded from this Arch machine and a battery-less one, like the Search mapper tests:
  - CPU % from two counter samples
  - RAM from the available figure
  - battery charging, discharging, full, not charging, and absent
- **Running the app** (headless Chrome, as before):
  - the System Widget appears under Weather on a fresh profile and on an existing one
  - the numbers change while Shown
  - the Health popover lists the parts
  - removing a key and rechecking shows Limited or Down
  - "¿cuánta batería me queda?" Shows the Widget and answers
  - stopping the dev server shows "No se puede contactar con Jarvis"

## Out of Scope

- History graphs or sparklines, and therefore an Expanded System Widget.
- Battery time remaining or time to full.
- Per-process numbers, disk, network, temperature or GPU.
- Measuring the browser's device when it differs from the server's (Jarvis only runs locally today).
- Battery on macOS or Windows.
- Jarvis warning on its own about low battery, high load or a failing part. Notifications of any kind.
- Each Installed Plugin's connection state in Health; that stays in the Marketplace.
- Fixing a failing part from the Widget (re-entering keys, reconnecting).
- Probes that make paid calls (generating text or speech to prove it works).

## Further Notes

- Decisions come from the grilling session on 2026-10-14 and are recorded in `CONTEXT.md`.
- Jarvis runs locally (`localhost:3000`), so "the computer Jarvis runs on" is the Owner's own computer. Deploying Jarvis elsewhere would make the System Widget report that server instead; that's acceptable until deployment is in scope.
- Nan's model IDs for transcription and speech are still best guesses (see the Nan config). If the model-list probe shows a configured ID missing, Health will say so, which is a feature.
- A Widget change from Jarvis applies when the Reply arrives (ADR 0002). So the System Widget appears with the Reply, not mid-Turn.
- Every existing profile already has every current Widget saved, because the first load saves the layout. So on the Owner's profile, the System Widget starts under wherever their Weather Widget is now (under Today at the top right).
