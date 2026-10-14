# Spec: Browse — Jarvis works through real websites, watched live in a Browser Widget

Status: ready-for-agent

## Problem Statement

Search covers most questions, but not all of them. Some answers sit behind a website's own pages, filters or multi-step flows that no search API reaches. Examples: "mira en la web de Renfe si quedan billetes del AVE de las 8", "comprueba en la web del ayuntamiento qué documentos piden para el empadronamiento", "mira en Ryanair cuánto cuesta añadir una maleta". Today Jarvis can only say it doesn't know. The Owner wants Jarvis to go and look on the real site, and wants to watch it work inside the app instead of trusting a black box. Because this takes minutes, not seconds, the Owner also needs to keep talking to Jarvis meanwhile, see when it's done, and be able to stop it.

## Solution

When a Search can't answer, Jarvis **proposes** to Browse and says it will take a couple of minutes ("No lo encuentro buscando; ¿quieres que lo mire en su web? Tardaré un par de minutos."). If the Owner agrees, Jarvis starts a **Browse Task**. A remote browser, run by Composio's `browser_tool`, works through the real website on its own, read-only. The Turn ends right away ("Me pongo con ello"). Jarvis doesn't stay Thinking.

A new built-in **Browser Widget** appears and shows the Browse Task live: the remote browser's screen as it navigates, what it's trying to do right now, and a stop button. The Owner can go on with other Turns meanwhile. When the Browse Task finishes, its outcome appears in the Browser Widget with a visual cue, and the Widget is Shown if it was Hidden. Jarvis doesn't speak on its own. The Owner asks "¿qué has encontrado?" in a normal Turn, and Jarvis answers from the outcome.

There is at most one Browse Task at a time. Starting another one stops the first. The Owner can stop it from the Widget or by voice ("para"). Hiding the Widget doesn't stop it. A Browse Task survives a page reload, because the server keeps it in `jarvis.db`.

Browse never logs in, fills in the Owner's details, books or pays.

## User Stories

### Starting

1. As the Owner, I want Jarvis to propose Browsing when a Search can't answer, so that I don't need to know when it's needed.
2. As the Owner, I want the proposal to say it will take a couple of minutes, so that I can decide whether it's worth it.
3. As the Owner, I want Jarvis to start a Browse Task only after I agree ("sí", "vale, míralo"), so that slow and costly work never starts without me.
4. As the Owner, I want to ask for Browse directly ("mira en la web de Iberia…"), and have that count as agreeing, so that I don't get asked twice.
5. As the Owner, I want Jarvis to answer at once when a Browse Task starts ("Me pongo con ello; puedes verlo a la izquierda"), so that I'm never stuck waiting through a long Thinking.
6. As the Owner, I want Jarvis to start the remote browser on the right site when it knows it, so that the task doesn't waste time finding the site.
7. As the Owner, I want Jarvis to hand the remote browser a clear, self-contained description of what to find, including dates and places I mentioned earlier, so that the task doesn't depend on our conversation.
8. As the Owner, I want starting a new Browse Task while one is running to stop the old one, and Jarvis to say so, so that there's never more than one.

### Watching

9. As the Owner, I want the Browser Widget to appear when a Browse Task starts, so that I can watch it.
10. As the Owner, I want to see the remote browser's screen live in the Browser Widget, so that I can see exactly what it's doing.
11. As the Owner, I want to see what the task is trying to do right now and on which page ("Buscando trenes Madrid–Barcelona · renfe.com"), so that I can follow along without reading the screen.
12. As the Owner, I want an "open live view in a new tab" link, so that I can watch it full-size.
13. As the Owner, I want the Browser Widget to fall back to the latest step's screenshot when the live view can't be embedded, so that I still see progress.
14. As the Owner, I want the Browser Widget to be larger than the Weather Widget, so that the remote browser's screen is readable.
15. As the Owner, I want to keep talking to Jarvis about other things while a Browse Task runs, so that my Turns aren't blocked.
16. As the Owner, I want to ask "¿cómo va?" and hear what the Browse Task is doing, so that I can follow it by voice.
17. As the Owner, I want to close or Hide the Browser Widget without stopping the Browse Task, so that I can tidy the screen and let it work.
18. As the Owner, I want to drag, toggle, and ask Jarvis to show, hide or move the Browser Widget like any other Widget, so that it behaves consistently.

### Stopping

19. As the Owner, I want a stop button in the Browser Widget, so that I can end a Browse Task in one click.
20. As the Owner, I want to say "para" or "déjalo" and have Jarvis stop the Browse Task, so that I can stop it hands-free.
21. As the Owner, I want Jarvis to say plainly when there's nothing to stop, so that it never pretends.
22. As the Owner, I want a Browse Task that runs too long to be stopped automatically, so that a stuck task doesn't run forever.

### Finishing

23. As the Owner, I want the Browser Widget to show the outcome when the Browse Task finishes: what it found, in a few lines, and the page it ended on, so that I can read it at a glance.
24. As the Owner, I want a visual cue when the Browse Task finishes, and the Browser Widget Shown if it was Hidden, so that I notice without being interrupted out loud.
25. As the Owner, I want Jarvis not to speak on its own when the task finishes, so that it never talks over me unprompted.
26. As the Owner, I want to ask "¿qué has encontrado?" and get the outcome in a normal Reply, so that I hear it when I'm ready.
27. As the Owner, I want to ask follow-ups about the outcome ("¿y a qué hora sale el siguiente?"), so that I can dig into it, knowing Jarvis can only answer from what the task found or by proposing a new Browse.
28. As the Owner, I want Jarvis to tell me honestly when the Browse Task failed or couldn't find the answer, and why if it knows, so that I'm never given a made-up result.
29. As the Owner, I want the outcome of the last Browse Task to stay until the next one replaces it, so that I can come back to it later.

### Surviving reloads

30. As the Owner, I want a running Browse Task to keep going and show up again in the Browser Widget after I reload the page, so that minutes of work aren't lost to a refresh.
31. As the Owner, I want a Browse Task that finished while the app was closed to show its outcome when I come back, so that nothing is lost.
32. As the Owner, I want Jarvis to know about the current Browse Task in any Session, including a new or resumed one, so that "¿qué has encontrado?" works wherever I ask it.

### Staying read-only

33. As the Owner, I want the remote browser never to log in, enter my personal details, book, buy, pay or submit forms that change anything, so that nothing happens on my behalf.
34. As the Owner, I want Jarvis never to give the remote browser my passwords or account details, so that my credentials never leave the app.
35. As the Owner, I want a Browse Task that reaches a login wall or a checkout to stop there and say so in its outcome, so that I can take over myself.
36. As the Owner, I want a Browse problem (Composio down, quota spent, the remote browser crashing) never to break a Turn, so that Jarvis always replies.

## Implementation Decisions

### Browse module (new)

- A new **Browse** module on the server owns the current Browse Task. It sits behind a **browser port** over Composio's `browser_tool` toolkit (`NO_AUTH`), so tests can pass a fake. The port has these operations:
  - start a task (task text, optional start URL) → task id and remote browser session id (`BROWSER_TOOL_CREATE_TASK`)
  - watch a task (task id, last step seen) → status (`started | finished | stopped | failed`), current goal, current URL, the latest new step's screenshot, output text, success flag (`BROWSER_TOOL_WATCH_TASK`). Composio leaves `current_goal` empty, so the current goal is the last line of the latest step's `memory`, in English (ticket 01). Watching a running task blocks for about 30 s on Composio's side.
  - get the live view URL for a remote browser session (`BROWSER_TOOL_GET_SESSION`)
  - stop a task (`BROWSER_TOOL_STOP_TASK`)
  The real port uses `@composio/core`'s tool execution with the single Owner user id and the existing `COMPOSIO_API_KEY`. It never passes `secrets`.
- The Browse module's interface: `start({ task, startUrl })`, `stop()`, `current()`. `current()` returns the **Browse Task view**: what was asked, status, current goal and URL, live view URL, latest screenshot URL, outcome text, success flag, and start and end times. It brings the task up to date from the port when the task is still running and was last checked more than a few seconds ago, so callers don't need to know about polling. Because a watch takes about 30 s, `current()` waits only a moment for that refresh and otherwise returns the last known view while the refresh finishes in the background. There is only one refresh at a time (ticket 01).
- When the module sees a Browse Task end, it also stops it at Composio, which frees the remote browser. Composio keeps it up otherwise (ticket 01). The live view is gone from then on.
- `start` stops any running Browse Task first. `stop` with nothing running is a no-op that reports "nothing running".
- **Read-only by construction:** the module wraps the task text in fixed read-only instructions before it reaches the remote browser. The wrapper says: do not log in, do not enter personal data, do not book/buy/pay or submit forms that change anything; stop at login walls and checkouts and report what you saw; answer in Spanish. The model only supplies the inner task.
- A Browse Task still running after a fixed limit (start at 10 minutes) is stopped by the module on its next refresh, and its outcome records that it timed out.
- **Persistence:** a new single-row table in `jarvis.db` (plus a migration) holds the current Browse Task: id, remote browser session id, what was asked, start URL, status, current goal and URL, live view URL, latest screenshot URL, last step seen, outcome text, success flag, `startedAt`, `endedAt`, `checkedAt`. The row is replaced on each `start` and kept after the task ends until the next `start`. Deleting a Session doesn't touch it. A Browse Task doesn't belong to a Session.

### Turn module

- New built-in tools for Jarvis:
  - `start_browse(task, startUrl?)`: its description says to call it only after the Owner agreed in this or the previous Turn, or asked for Browse directly. It returns a line for the model ("Navegación iniciada…"), or a failure line when the port fails, never a thrown error.
  - `stop_browse()`: returns what was stopped or that nothing was running.
- When a Turn calls `start_browse` successfully, it adds a `show` WidgetChange for the Browser Widget.
- Each Turn adds a **Browse notice** to the system prompt built from `current()`. When there is no Browse Task, nothing is added. When one is running, the notice gives what was asked, what it's doing and since when. When it's finished, failed, stopped or timed out, the notice gives what was asked, the status and the outcome text. Jarvis answers "¿cómo va?" and "¿qué has encontrado?" from this notice.
- If loading the Browse notice fails, the Turn skips it and goes on. A Browse problem never breaks a Turn.
- The system prompt gains a short Browse section: propose before starting and mention it takes minutes; after starting, reply in one sentence and point at the Widget; don't speak about the result until asked; never offer to log in, book or pay; when a task hit a login or checkout, tell the Owner they'll need to do that step themselves.
- The Turn never waits for a Browse Task. `MAX_REPLY_STEPS` is unchanged.

### Browse routes

- A thin route returns the Browse Task view (`GET`), calling the Browse module's `current()`. Another stops it (`POST`), calling `stop()`. The routes contain no logic of their own.

### Browser Widget (new built-in Widget)

- A new entry in the Widget catalog, `browser` ("Navegador"), built-in, with no settings schema, a Starting Spot in the left margin (left-middle), and a larger default size than Weather (sized for a 16:10 screen plus a status line).
- Its content comes from the Browse Task view, not from Widget Settings. On the client, polling belongs to the Session (or a hook next to it), **not** to the Widget component. It polls the view route every few seconds while the task is running, whether or not the Widget is Shown, stops polling once the task has ended, and loads the view once on page load.
- When polling sees the task end, the client Shows the Browser Widget if it's Hidden and gives it a short highlight. That is the visual cue. It makes no sound and Jarvis doesn't speak.
- Live view: ticket 01 confirmed it can be embedded, so while the task runs the Widget shows an iframe of the live view URL, sandboxed with only what the stream needs (`allow-scripts allow-same-origin`). Once it has ended, the remote browser is gone, so the Widget shows the latest step's screenshot instead. While running there is an "Ver en directo" link that opens the live view in a new tab.
- The Widget always shows: what was asked; the current goal (in English, as Composio gives it) and the domain of the current URL while running; the outcome text and the final URL as a link once ended; a stop button while running.

### Vocabulary

- **Browse**, **Browse Task**, **Browser Widget** are defined in `CONTEXT.md`. Avoid "job", "run", "agent" and "scrape" in names and comments.

## Testing Decisions

- Good tests check what the Owner gets: the Reply text and Widget changes from a Turn, what the system prompt tells Jarvis about the current Browse Task, and what the Browse Task view says over time. They don't check the polling cadence, the exact read-only wrapper wording or internal calls.
- **Main seam: the Browse module** (`start`, `stop`, `current`) over a **fake browser port** (a scripted sequence of watch results) and a real in-memory SQLite database (`openDatabase` as in the sessions and memory store tests), with an injected clock. Cases:
  - starting records the task and calls the port with the read-only wrapper and no secrets
  - `current()` on a running task refreshes from the port only after the check interval
  - the task finishing saves the outcome and success flag and stops further refreshes
  - starting a second task stops the first
  - `stop()` with nothing running reports so
  - the time limit stops the task and records the timeout
  - a port failure on refresh leaves the last known view and doesn't throw
  - a fresh module over the same database sees the task, which is how a reload is modelled
- **Second seam: the Turn module** (`take`) with the mock model and the fake Browse module:
  - `start_browse` → `show browser` WidgetChange, and the Reply returns at once
  - `stop_browse` stops it
  - the Browse notice appears in the system prompt for running and finished tasks and is absent with none
  - the Browse module throwing never fails the Turn
  Prior art: the plugin-failure tests in `turn.test.ts` ("Plugin problems never break a Turn").
- **Client:** extend the client Session tests so that polling starts on a running view, stops on an ended one, and an ended view Shows a Hidden Browser Widget. The Widget component and the live view are checked by running the app.
- No tests call the real Composio. Ticket 01 is the only live run.

## Out of Scope

- Logging in, entering the Owner's data, booking, buying, paying, or giving the remote browser any `secrets`. A future spec may add this behind explicit confirmation.
- Jarvis speaking on its own when a Browse Task ends (a Reply with no Utterance). That changes what a Turn is and needs its own grilling.
- A sound or chime when a Browse Task ends.
- More than one Browse Task at a time, a queue, or a history of past Browse Tasks.
- The Owner taking control of the remote browser (clicking or typing in the live view).
- An in-app browser the Owner drives themselves.
- Turning a Browse outcome into Results Widget cards. The outcome is shown as text in the Browser Widget.
- Running our own browser (Playwright, Browserbase or Hyperbrowser keys).

## Further Notes

- Depends on the Search spec (`.scratch/web-search/`): Browse is proposed when Search can't answer. Build Search first.
- **Ticket 01 must confirm, with one small live Browse Task:** the real `browser_tool` input and output shapes, how long a simple task takes, that `BROWSER_TOOL_GET_SESSION` returns a live view URL and whether that page can be embedded in an iframe (check `X-Frame-Options` / CSP `frame-ancestors`), how long screenshot URLs stay valid, and how many Composio credits one task uses. Record the answers in the ticket. The fallback is already part of this spec, so the result only changes which rendering path ships.
- Decisions come from the grilling session on 2026-10-14 and are recorded in ADR 0006 and `CONTEXT.md` (Browse, Browse Task, Browser Widget).
- Browse spends noticeably more Composio quota than Search. That's why Jarvis proposes instead of starting on its own.
