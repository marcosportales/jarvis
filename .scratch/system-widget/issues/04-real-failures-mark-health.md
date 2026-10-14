# 04: Failures in real use show in Jarvis Health at once

**What to build:** When a part fails while the Owner is actually using Jarvis, Health shows it as failing straight away, without waiting for the next probe, with a reason like "falló hace 2 min". A later success, from real use or a probe, puts it back to Working. The places that report:
- the Turn: Thinking when the model replies or throws, Remembering when saving the Turn fails
- the weather, Search and Browse tools: their failed outcomes and successes
- the transcription and speech routes: Understanding and Speaking

Reporting never throws and never slows a Turn.

See `../spec.md` (stories 27, 28; "Where real uses are reported").

**Blocked by:** 03

**Status:** done

- [x] Health tests: a reported failure overrides an older passing probe; a later success or passing probe clears it; the reason carries when it failed
- [x] Turn tests, with a fake Health:
  - Thinking reported working after a Reply and failing when the model throws
  - a weather or Search `failed` outcome reports that part failing
  - a Health reporter that throws doesn't fail the Turn
- [x] The transcription and speech routes report their part on success and failure
- [x] In the running app: with a wrong Composio key, asking for a Search turns Health Limited before the next probe would
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked against a production build on port 3100:

- With a wrong `COMPOSIO_API_KEY`, the probe first gave "Búsqueda y Plugins: la clave no es válida". Asking "Busca en la web el horario del Museo del Prado hoy" failed that Search, and Jarvis said it couldn't check and answered from memory. Health then showed "falló hace un momento" straight away, without a recheck.
- `POST /api/speech` succeeded and Speaking stayed working.
- Audio Nan can't decode no longer counts against Understanding (see below).

Notes:

- Nan answers audio it can't decode, such as a push-to-talk too short to hold any sound, with 415 "Failed to decode audio". At first that turned Understanding failing and Jarvis "Caído". Now the transcription and speech routes don't report a failure when the service rejected the input (400, 413, 415, 422). A rejected key (401) or an outage (5xx) still counts. Covered by a Health test.
- Thinking is blamed only when generating the Reply throws, not when building the system prompt does. Remembering is blamed when saving the Turn fails, except when the Session was deleted meanwhile.
- Probes re-run once a minute whenever anything asks for Health, and newer information wins. So a real-use failure normally shows as "falló hace un momento" until the next probe settles it, and longer "falló hace N min" readings are rare. This is what the spec asks for: a passing probe puts the part back to Working.
- Browse reports both starting and stopping a Browse Task.
