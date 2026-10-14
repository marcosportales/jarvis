# Spec: Expanded Widgets — the Owner or Jarvis shows a Widget large, then collapses it back

Status: ready-for-agent

## Problem Statement

Some Widgets show too much to fit in a small card in the margins. The Results Widget squeezes a whole Search into a 336 px column the Owner has to scroll. The Browser Widget shows the remote browser's live screen at a size where its text can't be read. The Owner wants to look at one of these properly for a moment, then put it back without losing its place. They want to do it by hand, and also by asking Jarvis ("amplía el navegador", "ciérralo") while push-to-talk keeps working. More Widgets like this will come, so it should be a general ability, not a one-off for two Widgets.

## Solution

An **Expandable** Widget can be **Expanded**: the same Widget, shown large in the middle of the page over a dimmed backdrop. Closing it **Collapses** it back to its usual card at its place, still Shown. Results and Browser are Expandable today. Weather isn't.

The Owner expands a Widget with an expand button in its header, or by double-clicking the header. The Expanded view takes about 90% of the width and 85% of the height, and the full screen on a phone. It covers the orb and the Transcript, so its header has a small Jarvis State dot next to the Widget's name and a collapse button. Esc, a click on the backdrop or the collapse button collapse it. Push-to-talk keeps working throughout, so the Owner can talk to Jarvis about what they're looking at.

Jarvis gets `expand_widget` and `collapse_widget` tools. It only uses them when the Owner asks. The layout notice tells Jarvis which Widget is Expanded, so "ciérralo" said then means collapse, not hide.

Each Widget is told whether it's Expanded and can arrange itself for the space. Results becomes a grid of cards with more detail. Browser shows a much larger live screen with the request and status beside it.

## User Stories

### Expanding by hand

1. As the Owner, I want an expand button in the header of an Expandable Widget, so that I can see it large with one click.
2. As the Owner, I want to double-click an Expandable Widget's header to expand it, so that I have a quick shortcut.
3. As the Owner, I want Widgets that aren't Expandable, like Weather, to have no expand button, so that I'm never offered something that does nothing.
4. As the Owner, I want a single click or a drag on a Widget to keep working as it does today, so that I don't expand a Widget by accident when I move it or open a link.
5. As the Owner, I want the Expanded Widget centred and large, about 90% of the width and 85% of the height, so that I can read it comfortably.
6. As the Owner on a phone, I want an Expanded Widget to take the whole screen, so that it's actually bigger than the card.
7. As the Owner, I want the other Widgets and the page dimmed behind an Expanded Widget, so that it's clear what I'm looking at.

### Collapsing

8. As the Owner, I want a collapse button in the Expanded Widget's header, so that I can put it back.
9. As the Owner, I want Esc to collapse the Expanded Widget, so that I can close it from the keyboard.
10. As the Owner, I want a click on the backdrop to collapse the Expanded Widget, so that closing it is what I'd expect.
11. As the Owner, I want a collapsed Widget to go back to exactly where it was and stay Shown, so that collapsing never loses it.
12. As the Owner, I want the Expanded view to have no hide button, so that I can't lose the Widget while I meant to shrink it.

### One at a time

13. As the Owner, I want expanding a second Widget to collapse the first, so that only one Widget is ever Expanded.
14. As the Owner, I want hiding the Expanded Widget (from the sidebar toggles or by voice) to collapse it first, so that the next time it's Shown it's back in its card.
15. As the Owner, I want an Expanded Widget not to be draggable, so that grabbing it doesn't do anything odd.
16. As the Owner, I want every page load to start with all Widgets Collapsed, so that a reload never hides the page behind a Widget I forgot about.

### Talking while Expanded

17. As the Owner, I want push-to-talk (holding Space or the orb's equivalent) to keep working while a Widget is Expanded, so that I can ask Jarvis about what I'm looking at.
18. As the Owner, I want a small Jarvis State dot in the Expanded Widget's header, so that I know whether Jarvis is Listening, Thinking or Speaking while the orb is covered.
19. As the Owner, I want to hear Jarvis's Reply while a Widget is Expanded, even though the Transcript is covered, so that I don't need to collapse it to get the answer.
20. As the Owner, I want typing into the prompt box to still be possible when no Widget is Expanded, and Esc to collapse when one is, so that the keyboard behaves predictably.

### Jarvis

21. As the Owner, I want to say "amplía el navegador" and have Jarvis expand the Browser Widget, so that I don't have to reach for the mouse.
22. As the Owner, I want to say "ciérralo" or "hazlo pequeño" while a Widget is Expanded and have Jarvis collapse it, so that "close" means what I see.
23. As the Owner, I want asking Jarvis to expand a Hidden Widget to also show it, so that one request is enough.
24. As the Owner, I want Jarvis to tell me when a Widget can't be expanded ("el del tiempo no se puede ampliar"), so that I know why nothing happened.
25. As the Owner, I want Jarvis never to expand a Widget on its own, for example when a Browse Task starts or a Search finds a long list, so that the page isn't taken over without my asking.
26. As the Owner, I want Jarvis to know which Widget is Expanded right now, so that its answers about the screen are right.
27. As the Owner, I want asking Jarvis to move the Expanded Widget to collapse it at its new Spot, so that I can see the move happen.
28. As the Owner, I want Jarvis moving a different Widget to leave the Expanded one as it is, so that what I'm looking at isn't disturbed.

### Each Widget at its best

29. As the Owner, I want the Expanded Results Widget to lay the Search's cards out as a grid with more of each result's details, so that I can compare options at a glance.
30. As the Owner, I want the links in the Expanded Results Widget to work as they do in the card, so that I can open a result.
31. As the Owner, I want the Expanded Browser Widget to show the live screen much larger, with what was asked, the current status and the stop button beside it, so that I can actually follow what the remote browser does.
32. As the Owner, I want the Browse Task's outcome to show up in the Expanded Browser Widget when it ends, so that I don't need to collapse it to see the outcome.
33. As the Owner, I want each Widget to look the same as today when Collapsed, so that nothing I'm used to changes.

### Later Widgets

34. As the Owner, I want a new Widget to become Expandable just by being declared so, so that future Widgets get this for free.

## Implementation Decisions

- **Domain terms** are in `CONTEXT.md`: Expanded / Collapsed, Expandable, and the updated Shown / Hidden ("closing a Collapsed Widget hides it; hiding an Expanded one collapses it first").
- **Widget catalog:** each entry can declare itself Expandable with an optional flag. Results and Browser set it. Weather doesn't. The flag is part of the server-safe Widget info, so the tools can see it.
- **Widget Board** owns the Expanded state beside Shown, position and Widget Settings:
  - `expand(id)` and `collapse()` are new operations. `collapse()` needs no id because at most one Widget is Expanded.
  - The snapshot says which Widget is Expanded, if any.
  - `expand` on an unknown or non-Expandable id does nothing. On a Hidden Widget it shows it too. On another Widget it replaces the current one.
  - `hide` on the Expanded Widget collapses it. `moveToSpot` on the Expanded Widget collapses it and moves it. `drag` on the Expanded Widget does nothing.
  - Expanded is **not** saved to storage, and the storage version doesn't change. A fresh Board always starts with nothing Expanded.
  - `describeLayout()` gives each entry an `expanded` boolean.
- **Widget changes** gain `{ type: "expand"; id }` and `{ type: "collapse" }`. `applyChanges` handles them in order, like the others. The layout schema sent with each Turn gains `expanded`.
- **Jarvis's Widget tools** (ADR 0002) gain:
  - `expand_widget(id)`: lists only Expandable Widgets in its description. For an unknown or non-Expandable id it returns a Spanish answer for the model and records nothing.
  - `collapse_widget()`: no input. If nothing is Expanded it still records the change, which is a no-op on the Board.
  - The descriptions and system prompt say Jarvis only expands when the Owner asks, and that "cerrar" while a Widget is Expanded means collapse.
  - The layout notice marks the Expanded Widget as "ampliado".
- **Widget layer:**
  - A Collapsed card gets an expand button next to ✕ (Expandable Widgets only), and double-clicking its header expands it.
  - The Expanded Widget renders in a centred frame over a dimmed backdrop: about 90vw × 85vh, full screen on narrow screens. Its header has the name, the Jarvis State dot and a collapse button.
  - Esc and a backdrop click collapse it.
  - It's not a focus-trapping modal and doesn't make the page inert, so push-to-talk keeps working. The UI kit's Dialog may be used only if it can be made non-modal in this way.
  - Collapsed cards keep their current drag behaviour.
- **Widget components** receive `expanded: boolean` in their props alongside settings. Weather ignores it. Results switches to a multi-column grid with more detail. Browser enlarges the live view and puts the request, status and stop button beside it.
- **Jarvis State dot:** the Expanded header reads the current Jarvis State from the client Session that already drives the orb. There's no new state source.
- No server persistence, database or API route changes. The Reply route already carries Widget changes and the layout.

## Testing Decisions

- Good tests check what the Owner and Jarvis get: the Board's snapshot and `describeLayout()` after a series of operations, and what Jarvis's tools record and answer. They don't check rendering classes, the CSS sizes or how the frame is built.
- **Main seam: the Widget Board**, the existing Board tests with a fake storage. Cases:
  - expanding an Expandable Widget marks it Expanded and notifies subscribers
  - expanding a non-Expandable or unknown Widget does nothing
  - expanding a second Widget collapses the first
  - expanding a Hidden Widget Shows it
  - collapsing returns it to the same position, still Shown
  - hiding the Expanded Widget collapses it, and showing it again comes back Collapsed
  - moving the Expanded Widget to a Spot collapses it there; moving another leaves it Expanded
  - dragging the Expanded Widget does nothing
  - Expanded is never saved: a fresh Board over the same storage has nothing Expanded
  - `applyChanges` handles `expand` and `collapse` in order
  - `describeLayout()` reports `expanded`
- **Second seam: Jarvis's Widget tools**, the existing tool tests:
  - `expand_widget` records an expand change for an Expandable Widget
  - for Weather or an unknown id, it answers in Spanish and records nothing
  - `collapse_widget` records a collapse change
  - the layout notice says "ampliado" for the Expanded Widget only
- **Running the app** (headless Chrome, as for the Browser Widget):
  - the expand button and header double-click
  - the backdrop, Esc and the collapse button
  - push-to-talk while Expanded
  - the Jarvis State dot
  - the full screen view on a phone
  - the Expanded layouts of Results and Browser
  - a reload starting Collapsed

## Out of Scope

- Jarvis or a Widget expanding on its own, for example on a Browse Task starting or a long Search.
- Plugin Widgets (MCP Apps, ADR 0003) being Expandable or asking to go fullscreen themselves. Expanded is defined so it can later map onto MCP Apps' fullscreen display mode.
- More than one Expanded Widget, side-by-side Expanded Widgets, or resizing Widgets freely.
- Remembering Expanded across reloads or Sessions.
- Showing the Transcript inside or beside the Expanded view.
- A per-Widget Expanded size.
- Making the Weather Widget Expandable.

## Further Notes

- Decisions come from the grilling session on 2026-10-14 and are recorded in `CONTEXT.md` (Expanded / Collapsed, Expandable). No ADR: the choice is cheap to reverse and follows ADR 0002's pattern.
- Expand and collapse requests from Jarvis apply when the Reply arrives, like every Widget change (ADR 0002), not mid-Turn.
- Space as push-to-talk is skipped only while typing in a text field. With a button inside the Expanded Widget focused, check that Space doesn't both press it and start push-to-talk. The same is already true of Collapsed cards.
