# 05: Jarvis answers about the computer and its own Health

**What to build:** Jarvis gets a built-in `get_system_status` tool. With it, it answers "¿cuánta batería me queda?", "¿cómo va la memoria?", "¿está muy cargado el ordenador?" and "¿está todo funcionando?" out loud, naming any failing part and why.
- Whenever it uses the tool, the Reply Shows the System Widget, unless the model already did something with it that Turn. It never Expands it.
- Without a battery, Jarvis says the computer has none.
- Jarvis never brings these things up unasked.
- A failing read answers that it couldn't check, and the Turn still replies.
- The tool uses Health's cached report, so asking never triggers probes more than about once a minute.

See `../spec.md` (stories 32–37; "Jarvis's tool and the Turn").

**Blocked by:** 02, 03

**Status:** done

- [x] Turn tests, with a fake Machine and a fake Health:
  - `get_system_status` → a `show` for `system`; the model hiding it in the same Turn wins; never `expand`
  - the tool's answer with a battery, without one, and with a failing part named
  - a failing Machine read answers the model and the Turn still replies
- [x] The system prompt tells Jarvis to use the tool for the computer and its Health, never guess, and not bring them up unasked
- [x] In the running app:
  - "¿cuánta batería me queda?" Shows the Widget and answers with the same % it shows
  - "¿está todo funcionando?" answers with the Health level
  - an unrelated question never mentions any of it
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked against a production build on port 3100 (headless Chrome, 1600 × 1000):

- "quita el sistema" Hid it. "¿cuánta batería me queda?" Showed it again under Weather and answered "Te queda un noventa y uno por ciento, y está cargando.". The Widget showed 91 %, and the laptop had just been plugged in.
- "¿está todo funcionando?" answered "Casi todo: el ordenador va bien, pero mi parte del tiempo está fallando, así que ahora mismo no puedo darte la previsión. Te dejo el detalle en pantalla." Health was Limited, with "Tiempo" failing.
- "¿Cuál es la capital de Portugal?" answered "Lisboa, por supuesto." without mentioning any of it.

Notes:

- The tool gives the model the CPU, the RAM, the battery ("está cargando" or "no está cargando", or "este ordenador no tiene batería") and the Health level, plus only the failing parts with their reasons. The computer and Health are read independently, so if one fails the tool still answers with the other.
