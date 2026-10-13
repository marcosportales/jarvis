# 05: Drag Widgets by hand

**What to build:** The Owner grabs a Widget anywhere except its ✕ and drags it anywhere on screen, including over the chat, with a mouse or a finger. The position is remembered across reloads and the Widget always stays inside the window, also when it's resized. A Widget without a Starting Spot first appears at a random free place in the left or right margin, not overlapping other Shown Widgets. Weather keeps its Starting Spot; the random case is covered by Board tests with a test registry.

- The Widget Board gains: drag to a free position (stored as fractions of the viewport), viewport resize with clamping, and random first placement in the margins using its injected random source.
- Dragging uses pointer events; pressing the ✕ never starts a drag.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The Weather Widget can be dragged anywhere on screen by mouse and by touch
- [ ] Clicking the ✕ still closes it and never drags it
- [ ] The dragged position survives a reload
- [ ] Shrinking the window keeps the Widget fully visible
- [ ] Widget Board tests (seeded random, fixed viewport) cover: drag and persist, clamping on resize, random placement in the margins without overlap for Widgets without a Starting Spot
- [ ] Lint, typecheck and tests pass
