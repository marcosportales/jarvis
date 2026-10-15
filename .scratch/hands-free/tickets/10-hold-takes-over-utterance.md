# 10: A hold takes over a hands-free Utterance

**What to build:** With Hands-free on, the Owner starts speaking, Jarvis goes to Listening, and then they hold the Orb, Space or the global key, maybe because the room got noisy or because they want to keep talking through a pause. The hold takes that Utterance over instead of starting a second one. Whatever was already heard stays in it. From then on the Utterance follows the hold's rules: pauses no longer end it, and releasing the hold sends it at once. One stretch of speech always makes one Turn. Today a hold here does nothing. Orb input's `hold()` returns early while the Jarvis State is Listening, and `pressPushToTalk()` refuses anything outside Idle or Speaking. So a long press is ignored and the Utterance ends on its own pause, while a short press is a tap that turns Hands-free off.

**Blocked by:** 02: A hands-free Turn on the Jarvis page

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md) (story 54)

- [ ] Orb input no longer treats Listening as "already held". A hold that reaches 300 ms during a hands-free Utterance calls `pressPushToTalk()` and belongs to its source. That holds for Space, the Orb and the Jarvis App's global key (which holds at once). A second press while a hold is going on still does nothing.
- [ ] `pressPushToTalk()` during a hands-free Utterance (Listening, no hold yet) takes over the capture that is already running instead of refusing or starting a new one. The pieces already sent to the Transcriber stay in it, in order, and are not sent again. The State stays Listening. `micOpen` stays true, and the snapshot shows a hold in progress.
- [ ] The Listener's `holdStart()` mid-Utterance keeps the speech it has heard but not yet cut into a piece, pre-roll included, so no word is lost at the seam. Voice detection's own boundaries are ignored from then on: no `pieceReady` or `endOfTurn` from a pause until `holdEnd()`.
- [ ] On release, the hold's audio comes as the last piece and the Utterance is sent at once, without waiting for a pause. The Brain gets one message: the earlier pieces' texts joined with the hold's texts, in order. It is asked only once every text is back.
- [ ] Once a hold has taken it over, the Utterance is a Push-to-talk one. One with no words gets the "No te entendí" hint, not the silent drop. The 500 ms minimum counts the earlier pieces' durations too.
- [ ] After the release, Hands-free is still on and the Listener stays open, back on its own pauses for the next Utterance. If Hands-free was turned off during the hold, the Listener closes on release, as ticket 02 does already.
- [ ] A page blur during a take-over hold ends it like any page hold: the Utterance is sent, with the earlier pieces kept.
- [ ] A press released within 300 ms during a hands-free Utterance stays a tap, as today. Changing what that tap does to the Utterance is not part of this ticket.
- [ ] Session tests with fake timers cover:
  - a hold during a hands-free Utterance giving one Turn, with the earlier pieces and the hold's pieces joined in order and no piece transcribed twice;
  - a pause during the hold not ending the Utterance;
  - the release sending at once;
  - a taken-over Utterance with no words getting the hint;
  - Hands-free still on and the Listener still open after the release;
  - Hands-free turned off during the take-over hold closing the Listener on release.
- [ ] Orb input tests cover a hold during Listening reaching `pressPushToTalk()` for each source, and a blur ending a take-over page hold.
