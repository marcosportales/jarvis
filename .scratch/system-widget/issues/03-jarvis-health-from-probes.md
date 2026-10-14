# 03: The Jarvis Health button checks every part

**What to build:** The System Widget's Health button shows Working / Limited / Down ("Funcionando" / "Limitado" / "Caído") as a coloured dot and a word.
- Clicking it opens a list of Jarvis's parts, each with its own level and a one-line Spanish reason when failing, and re-checks right away. The parts are Entender, Pensar, Hablar, Memoria, Búsqueda y Plugins, Tiempo and Navegador.
- Health comes from free probes, run at most about once a minute and only because the Widget asks:
  - Nan's model list for the three models
  - a trivial database query
  - a cheap Composio call
  - the weather for the fallback city
- A missing key fails its part with "sin configurar" without calling anything.
- When Jarvis's server can't be reached, the Widget shows "No se puede contactar con Jarvis" with Health at Down, and keeps retrying.

This ticket builds the Health module with probes and `current()`. Real-use reporting comes in 04.

See `../spec.md` (stories 18–26, 29–31; "Jarvis Health", "Server route and the Widget").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Health module tests, with fake probes, clock and env:
  - all pass → Working
  - a Limited part fails → Limited; an essential one fails → Down
  - a missing key → "sin configurar" and the probe isn't called
  - probes re-run only after ~60 s or on recheck
  - concurrent calls share one probe run
  - a probe that throws or hangs past a timeout counts as failing, never as an exception
- [ ] One Nan model-list request serves Understanding, Thinking and Speaking; a configured model ID missing from the list fails that part
- [ ] No probe generates text or speech
- [ ] Individual Plugins' connection states don't appear in Health
- [ ] The route includes the HealthReport, and the recheck flag forces probes
- [ ] In the running app:
  - the popover lists the parts
  - removing `COMPOSIO_API_KEY` and rechecking shows Limited
  - removing `NAN_API_KEY` shows Down
  - stopping the dev server shows "No se puede contactar con Jarvis"
- [ ] Typecheck, lint and the full test suite pass
