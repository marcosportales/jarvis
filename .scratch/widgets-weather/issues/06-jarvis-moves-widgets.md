# 06: Jarvis moves Widgets to Spots

**What to build:** The Owner says "pon el tiempo abajo a la izquierda", and the Weather Widget slides to that Spot. A Spot is one of six: left or right × top, middle or bottom, with no centre. Moving a Hidden Widget also Shows it. A Widget moved onto a Spot that already holds another Widget stacks next to it: below, or above at the bottom Spots.

- The Widget Board gains: move to a Spot, Spot-to-position mapping within the side margins, stacking, and the nearest Spot for any position.
- A new Widget change, move `{ id, spot }`, and a `move_widget(id, spot)` tool generated from the registry, with the six Spots as an enum.
- The layout sent to Jarvis now includes each Widget's nearest Spot, so he can answer "¿dónde está el tiempo?".
- Jarvis-driven moves animate to the target. The animation is skipped when the Owner prefers reduced motion; the Owner's drags never animate.

Use the vocabulary from CONTEXT.md (Spot).

**Blocked by:** 04, 05

**Status:** done

- [x] "Pon el tiempo abajo a la izquierda" slides the Weather Widget to the bottom-left Spot, and the new position survives a reload
- [x] Moving it while Hidden Shows it
- [x] With reduced motion on, it jumps without animating
- [x] "¿Dónde está el tiempo?" gets a correct answer, also after the Owner dragged it
- [x] Widget Board tests cover: move to each Spot, moving a Hidden Widget Shows it, stacking at an occupied Spot, nearest Spot of a dragged position
- [x] Tool tests cover `move_widget` recording the change, and invalid Spots or ids giving an error and no change
- [x] Lint, typecheck and tests pass

## Comments

Checked by hand against the real model (`next dev` on a side port, headless Chromium at 1600×1000):

- "Pon el tiempo abajo a la izquierda" typed on the Jarvis page: the Widget glided there (an intermediate frame was caught mid-move) and stayed there after a reload.
- With `prefers-reduced-motion: reduce` the same move jumped with no intermediate frame.
- After the Owner dragged it to the right-middle area, "¿Dónde está el tiempo?" got "Lo tienes a la derecha en medio."
- Closed with ✕, then "Pon el tiempo arriba a la izquierda" Showed it at left-top.
- "Pon el tiempo en el centro" got an offer of the six Spots and no change.
- Spoken input wasn't exercised (no microphone headless); it goes through the same Reply path.
