# 11: The Expanded Calendar shows a week or a month

**What to build:** The Calendar Widget becomes Expandable.
- Expanded, it shows the week of the day it was showing, Monday first, with each day's Agenda Items.
- A switch changes between week and month, kept as the `view` Widget Setting.
- Previous, next and "hoy" controls move around by hand.
- Each item opens the same details as in the card.
- Collapsing shows the day the Owner was last looking at.
- By voice, "amplía el calendario" Expands it and "enséñame el mes" Expands it in month view, using the existing Widget tools with the Calendar's settings. Jarvis still never Expands it on its own.

See `../spec.md` (stories 30–34, 38).

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Tool test: the Calendar is listed as Expandable, and `show_widget` accepts its `view` and `day` settings
- [ ] Test of the server route's handler: a week and a month of Agenda Items in one request
- [ ] In the running app:
  - the expand button and "amplía el calendario" Expand it to the week
  - the month switch and previous, next and hoy controls work
  - "enséñame el mes" Expands it in month view
  - collapsing keeps the day
- [ ] Typecheck, lint and the full test suite pass
