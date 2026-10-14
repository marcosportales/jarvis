# 10: Jarvis reads the Agenda and Shows the Calendar on the day asked

**What to build:** The Owner asks "¿qué tengo hoy?", "¿qué tengo el jueves?" or "¿cuándo es la reunión con Ana?". Jarvis answers out loud from their Google Calendar and Shows the Calendar Widget on that day, on its own, never Expanded.
- **`read_agenda(from, to)`** is built into Jarvis over the Agenda module. It's offered only while Google Calendar is Connected, and answers with compact Agenda Items.
- **Turn rule:** when `read_agenda` ran, the Reply Shows the Calendar Widget with `day` set to the first day read, unless the model already did something with it.
- **Not Connected:** while Google Calendar isn't Connected, the Turn adds a notice. Jarvis then tells the Owner to install it from the Marketplace ("enséñame el calendario" included).
- **Failures:** an Agenda failure answers the model in Spanish and never fails the Turn.
- **Layout notice:** it gives the Calendar's day and view, so "¿y el día siguiente?" works.
- **Settings reset on load:** a catalog entry can name Widget Settings that every page load drops. The Calendar's `day` resets to today on each load; `view` is kept.
- **System prompt:** it says Jarvis can read the Agenda but not change it. It keeps "no ofrezcas recordatorios, que no puedes poner".

See `../spec.md` (stories 19, 35–42).

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] Turn tests with a fake Agenda:
  - `read_agenda` gives a `show` of the Calendar with `day`, and no `expand`
  - the model's own change to the Calendar wins
  - `read_agenda` isn't offered and the notice is present when not Connected
  - a failing Agenda still gives a Reply
  - Google Calendar's raw tools never reach the model
- [ ] Board test: the Calendar's `day` is dropped on load and `view` kept
- [ ] Tool test: the layout notice gives the Calendar's day and view
- [ ] In the running app, by voice:
  - "¿qué tengo el jueves?" answers from the calendar and Shows the Widget on Thursday
  - "¿y el viernes?" follows on
  - a reload shows today again
  - without the Plugin, Jarvis points to the Marketplace
- [ ] Typecheck, lint and the full test suite pass
