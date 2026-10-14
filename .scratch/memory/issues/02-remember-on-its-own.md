# 02: Jarvis Remembers on its own, within the bar

**What to build:** Jarvis Remembers lasting facts the Owner mentions without being asked (preferences, people, places, routines, standing instructions), says so in a few words ("Lo tendré en cuenta"), and shows the "Recordado" marker. It does not Remember things a Plugin can look up, things only true for now ("mañana tengo dentista"), or secrets (passwords, PINs, card numbers, codes). For secrets it says in one sentence that it won't keep them. This is mostly Spanish system-prompt rules on top of ticket 01's tools.

See `.scratch/memory/spec.md` → user stories 3–7.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] "Prefiero que me hables de tú" in passing gets a brief acknowledgement and a marker
- [ ] "Mañana tengo dentista a las 10" is not Remembered
- [ ] "Mi PIN es 1234" is not Remembered, and Jarvis says so
- [ ] Asking about emails or weather never produces a Memory
- [ ] Checked by hand against the real model (judgment isn't unit-tested)
- [ ] Lint, typecheck and tests pass
