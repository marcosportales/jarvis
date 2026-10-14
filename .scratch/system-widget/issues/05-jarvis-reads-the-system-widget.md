# 05: Jarvis answers about the computer and its own Health

**What to build:** Jarvis gets a built-in `get_system_status` tool. With it, it answers "¿cuánta batería me queda?", "¿cómo va la memoria?", "¿está muy cargado el ordenador?" and "¿está todo funcionando?" out loud, naming any failing part and why.
- Whenever it uses the tool, the Reply Shows the System Widget, unless the model already did something with it that Turn. It never Expands it.
- Without a battery, Jarvis says the computer has none.
- Jarvis never brings these things up unasked.
- A failing read answers that it couldn't check, and the Turn still replies.
- The tool uses Health's cached report, so asking never triggers probes more than about once a minute.

See `../spec.md` (stories 32–37; "Jarvis's tool and the Turn").

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] Turn tests, with a fake Machine and a fake Health:
  - `get_system_status` → a `show` for `system`; the model hiding it in the same Turn wins; never `expand`
  - the tool's answer with a battery, without one, and with a failing part named
  - a failing Machine read answers the model and the Turn still replies
- [ ] The system prompt tells Jarvis to use the tool for the computer and its Health, never guess, and not bring them up unasked
- [ ] In the running app:
  - "¿cuánta batería me queda?" Shows the Widget and answers with the same % it shows
  - "¿está todo funcionando?" answers with the Health level
  - an unrelated question never mentions any of it
- [ ] Typecheck, lint and the full test suite pass
