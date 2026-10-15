# Spec: Transcript Widget — the Orb and voice take the middle, the Transcript moves into a Widget

Status: ready-for-human

Prototype: branch `prototype/transcript-widget`, `?variant=A|B|C` on any Jarvis route. The Owner picked **B, Subtítulos**; built on `feat/transcript-widget`.

## Problem Statement

The Jarvis page puts the Transcript in the middle, with the Orb above it, so it reads as a chat with a voice button. The Owner talks to Jarvis by voice, and wants the Orb and that conversation to be the page, with the written record out of the way until they want it.

## Solution

The Transcript and the text box become the **Transcript Widget** (ADR 0010): a built-in, Expandable Widget with no Widget Settings, Starting Spot left-bottom, starting Shown. After that it's kept Shown or Hidden like any Widget. The middle of the page holds only the Orb, the Jarvis State, the hint and, while the Transcript Widget is Hidden, **Captions** of the last Turn.

Decisions:

1. A normal Widget in the catalog and registry, so `show_widget` / `hide_widget` / `move_widget` / `expand_widget` / `collapse_widget` work on it with no new control logic (ADR 0002). It's built in, so ADR 0007's Plugin gating doesn't apply.
2. It's named Transcript Widget, shown to the Owner as «Conversación».
3. Captions show only while the widget is Hidden. While Thinking they show the Owner's words as understood; from Speaking until the next Utterance starts, the whole Reply, cut after 4 lines. They also show Memory events and errors. An empty Session shows the welcome text instead. The centre column keeps its 672px width.
4. To type with the widget Hidden, the Owner uses an «Escribir» control under the Orb, or Enter or `/` when no text field has focus. Either one Shows the widget and focuses its text box. If the widget is already Shown, they just focus the box.
5. Its Starting Spot is left-bottom and it starts Shown. Its card is about 360×520 and scrolls inside.
6. On a phone it's pinned along the bottom edge at full width and isn't draggable. Expanded, it takes the full screen, as every Expanded Widget does.
7. Jarvis Shows or Hides it only when the Owner asks. No Turn Shows it on its own.

Unchanged: Session navigation (sidebar), Space push-to-talk (not while typing in the box), Memory events on each Reply in the Transcript, and the empty-Session greeting.

## Centre layout (decided: B, Subtítulos)

The Orb, larger (256px; 192px on a phone), alone in the middle with the Jarvis State and hint. Below it, while the Transcript Widget is Hidden, the Caption is a dark subtitle strip near the bottom of the centre column («Tú: …» small, then the Reply), and a round pencil button «Escribir» sits under it. Rejected: A (captions stacked under the Orb) and C (smaller Orb with the last Turn as bubbles and a fake text box).

## Known limits

- On a short window with Results and Browser both Shown, the left column has no room for a 520px card at left-bottom: the Board stacks it upward and clamps it to the top, over Results. The Owner can drag it, and later loads keep its place.
- On a phone, other Widgets still float over the whole page as before, and can cover the Caption and the «Escribir» button.

## Done when

A Session can run entirely by voice with the Transcript Widget Hidden: every Reply, Memory event and error reaches the Owner as Captions. Showing it then gives the full Transcript, and Expanding it gives that Transcript large in the middle.

## Out of scope

- Word-by-word captions. The Reply arrives whole before it's spoken, and there are no word timings.
- The Floating Orb: it holds nothing but the Orb (CONTEXT.md).
