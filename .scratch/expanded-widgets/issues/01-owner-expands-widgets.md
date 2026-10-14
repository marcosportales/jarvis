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

**Status:** done

- [x] Board tests cover every rule above, including a fresh Board over the same storage having nothing Expanded
- [x] In the running app: the expand button and header double-click expand Results and Browser, and Weather shows no expand control
- [x] In the running app: Esc, a backdrop click and the collapse button each collapse the Widget back to its place, still Shown
- [x] In the running app: push-to-talk works while a Widget is Expanded, and the Jarvis State dot follows Listening, Thinking and Speaking
- [x] In the running app: a phone-sized window shows the Expanded Widget full screen, and a reload starts with everything Collapsed
- [x] Typecheck, lint and the full test suite pass

## Comments

Done on 2026-10-14. Checked in the running app (headless Chrome):

- Results and Browser have an expand button and expand on a header double-click; Weather has neither, and double-clicking its header does nothing.
- Expanded, a Widget is 1296 × 765 in a 1440 × 900 window, centred over a dimmed backdrop, and 390 × 844 (the whole screen) in a phone-sized window.
- Esc, a backdrop click and the collapse button each brought it back to exactly the same place, still Shown.
- Holding Space while Expanded turned the dot Listening; a typed message took it through Thinking and Speaking back to idle. With the collapse button focused, Space started push-to-talk and didn't press the button.
- A reload started with everything Collapsed.
- The card stays the same element when Expanded, so the Widget inside keeps its state (the Browser's live view doesn't reload).
- Pointer capture sends clicks to the card, so the header double-click is heard on the card and checked against the header's position.
- The Board already applies `expand` and `collapse` Widget changes; 02 adds the tools that record them.
