# 02: Jarvis proposes, starts and stops a Browse Task, by voice

**What to build:** When a Search can't answer, Jarvis offers to look on the real site. Once the Owner agrees, it starts a Browse Task and replies right away ("Me pongo con ello"). There's no Widget yet. Everything works by voice: "¿cómo va?" gets what it's doing, "¿qué has encontrado?" gets the outcome once done, and "para" stops it. The Browse Task lives on the server, so it survives a reload and every Session sees it.
- A new Browse module (`start`, `stop`, `current`) over the browser port from ticket 01 and a new single-row table in `jarvis.db` (with a migration). `current()` refreshes from the port when the task is running and was last checked more than a few seconds ago. It saves the outcome when the task ends, stops a task that runs past the time limit (10 minutes to start), and keeps the last known view when the port fails.
- `start` wraps the model's task in fixed read-only instructions (no logins, no personal data, no booking, buying, paying or forms that change anything; stop at login walls and checkouts and say so; answer in Spanish) and never passes `secrets`. It stops any running Browse Task first.
- Jarvis gets the built-in `start_browse(task, startUrl?)` and `stop_browse()` tools. Each Turn gets a Browse notice from `current()` (none when there's no Browse Task). A Browse problem never breaks a Turn.
- The system prompt gets the Browse section: propose first and mention it takes minutes; start only after the Owner agrees or asks directly; after starting, reply in one sentence; don't bring up the outcome until asked; never offer to log in, book or pay.
- Thin routes to read the Browse Task view and to stop it. Ticket 03 uses them.

**Blocked by:** 01; web-search 02 (Jarvis answers from the web)

**Status:** done

- [x] Browse module tests over a fake browser port and in-memory SQLite with an injected clock, for every case in the spec's Testing Decisions (start with the read-only wrapper and no secrets, refresh interval, finishing, second start stops the first, stop with nothing running, time limit, port failure, a fresh module sees the saved task)
- [x] Turn tests: `start_browse` and `stop_browse` reach the Browse module; the Browse notice is present for running and ended tasks and absent with none; the Browse module throwing never fails the Turn
- [x] In the running app: Jarvis proposes Browse when Search can't answer, starts after "sí", answers "¿cómo va?" and, after it ends, "¿qué has encontrado?", including after a reload
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app with real Composio and the real model:

- "¿Cuánto cuesta añadir una maleta facturada de 20 kilos a un vuelo de Ryanair…?": Jarvis answered from Search and offered to look on Ryanair's site, saying it takes a couple of minutes. "Sí, míralo" started the Browse Task (`show browser`, "Me pongo con ello; puedes verlo a la izquierda en el navegador."). It finished in about 2 minutes, and "¿Qué has encontrado?" got the outcome, both in that Session and in a new one.
- A direct request ("Mira en la web de Ryanair cuánto cuesta añadir embarque prioritario…") started without asking first.
- Found live and fixed: the model had asked the remote browser to "simular la reserva", and the remote browser typed a made-up passenger name to reach a bag price. Nothing was booked or paid. The read-only wrapper now forbids typing any personal details, even made-up ones, and stopping at any step that asks for passenger details. The tool description and the prompt now forbid asking for simulated bookings. The next live task stopped short of the booking flow as intended.
- Also found live: some steps come with an empty `memory`, so the goal now comes from the newest step that has one.
