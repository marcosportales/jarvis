# 01: The Owner expands and collapses a Widget by hand

**What to build:** The whole Expanded / Collapsed model, used by hand. The Results and Browser Widgets get an expand button in their header, and double-clicking the header also expands them. Weather has neither. An Expanded Widget shows large and centred, about 90% × 85% of the window and the full screen on a phone, over a dimmed backdrop. Its header shows its name, a small Jarvis State dot and a collapse button. Esc, a backdrop click or the collapse button bring it back to its place, still Shown. Push-to-talk keeps working while it's Expanded. See `../spec.md`.
- Catalog: an optional Expandable flag; Results and Browser set it.
- Widget Board: `expand(id)` and `collapse()` operations, and the snapshot says which Widget is Expanded. Rules:
  - only Expandable Widgets in the registry can expand
  - at most one is Expanded, so expanding another collapses the first
  - expanding a Hidden Widget Shows it
  - hiding the Expanded Widget collapses it
  - moving it to a Spot collapses it there
  - dragging it does nothing
  - Expanded is never saved, so a fresh Board starts with nothing Expanded
  - `describeLayout()` reports `expanded`
- Widget layer: the expand control on Collapsed cards; the Expanded frame with backdrop, Esc and collapse. It's not a focus-trapping modal, and the page stays live. Collapsed cards drag exactly as today.
- Widget components receive `expanded` in their props. In this ticket they only fill the larger space; the layouts for the larger space are 03 and 04.
- The Jarvis State dot reads the state the orb already uses.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Board tests cover every rule above, including a fresh Board over the same storage having nothing Expanded
- [ ] In the running app: the expand button and header double-click expand Results and Browser, and Weather shows no expand control
- [ ] In the running app: Esc, a backdrop click and the collapse button each collapse the Widget back to its place, still Shown
- [ ] In the running app: push-to-talk works while a Widget is Expanded, and the Jarvis State dot follows Listening, Thinking and Speaking
- [ ] In the running app: a phone-sized window shows the Expanded Widget full screen, and a reload starts with everything Collapsed
- [ ] Typecheck, lint and the full test suite pass
