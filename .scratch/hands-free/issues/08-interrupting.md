# 08: Interrupting: does speaking over Jarvis cut it short?

Type: grilling
Status: resolved
Blocked by: 03, 07, 13

## Question

Today, starting Push-to-talk cuts Speaking short. With no key, what does the Owner's voice do while Jarvis is busy?
- **While Speaking:** does speaking over the Reply stop it (barge-in)? What counts as an interruption ("mm-hm", a cough, the Owner reading along)? Is the cut-off Reply kept whole in the Transcript, or trimmed?
- **While Thinking:** if the Owner keeps talking or adds something before the Reply starts, is that a new Turn that replaces the pending one, more of the same Utterance, or ignored?

The answer is bounded by what echo cancellation can guarantee: if Jarvis can't reliably tell its voice from the Owner's while Speaking, barge-in may not be possible.

## Answer

**While Speaking: the Owner's voice cuts the Reply short (barge-in), on the Jarvis page.** In the Jarvis App, half duplex stays until the App is measured with the **Does Jarvis hear its own Reply on this machine's speakers?** page. Until then, interrupting there takes a tap or a hold. Once the App passes, it gets voice barge-in with no new decision.

**What counts as an interruption: a stricter gate while Speaking.** About 500–600 ms of continuous speech, against 250 ms normally. Once a Reply is cut, it stays cut; nothing resumes. Coughs, a "mm-hm" and short noises pass; a real interruption lands in about half a second. There's no word-level check ("is this a backchannel?"), because that needs Whisper and adds seconds. Keep the minimum speech configurable. The interrupting speech becomes the next Utterance as usual; the 400 ms pre-roll keeps its start.

**A tap while Speaking stops the Reply only,** and hands-free stays as it was. Anywhere else a tap toggles hands-free, as in **How a conversation opens**. A hold always cuts the Reply and starts Push-to-talk, as today. The Orb's look while Speaking should make the tap's meaning clear.

**An Interrupted Reply is a Reply the Owner didn't fully hear:** cut short partway, or never spoken (below). It stays whole in the Transcript, marked as interrupted. The model's next message says it was interrupted and roughly where: Kokoro isn't streamed, so the estimate is the share of audio played times the text. Today it is kept whole and unmarked (the server saves the whole Turn, so the model believes everything was heard). The exact wording to the model is a spec detail.

**While Thinking: speech queues as the next Turn.** If the Owner says more after a Turn is sent ("…a las siete", "no, espera"), it doesn't replace or join the pending Turn: the first chat call may already have run a tool or Remembered something, and the server saves it anyway. Several bits of speech during one Thinking join into a single queued Turn. A hold for Push-to-talk during Thinking queues the same way. Today `canStartTurn()` ignores it.

**When that Reply arrives with a Turn queued, it is shown, not spoken.** It goes into the Transcript as an Interrupted Reply (never spoken), the model is told the Owner didn't hear it, and the queued Turn is sent right away. A person talked over while preparing an answer doesn't recite it anyway, and this saves Kokoro's 1–1.7 s.

**Left open for the spec / other tickets:**
- Whether Whisper understands speech spoken over a Reply. Echo is cancelled, but up to about 0.9 s of it overlaps the Reply (pre-roll plus the stricter gate). It wasn't measured in **Does Jarvis hear its own Reply on this machine's speakers?**; check it when the App is measured.
- The glossary wording for Speaking, Thinking and **Interrupted Reply**: **Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State**.
- How the Orb and Caption show "heard you, queued" during Thinking and an Interrupted Reply: the Orb/Caption fog on the map.
