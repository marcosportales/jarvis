# 06: Speech during Thinking queues as the next Turn

**What to build:** If the Owner adds something while Jarvis is Thinking ("…a las siete", "no, espera"), it isn't ignored: it becomes the next Turn. Jarvis stays Thinking, with a cue that it heard and queued it. When the pending Reply arrives it is shown, not spoken, marked as an Interrupted Reply that was never spoken, and the queued Turn goes out at once. A hold or a typed message during Thinking queues the same way.

**Blocked by:** 02: A hands-free Turn on the Jarvis page; 04: Interrupted Reply, end to end

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] Speech heard during Thinking keeps the State on Thinking and sets `queued` on the snapshot
- [ ] Its pieces are transcribed and several bits of speech in one Thinking join into one queued message
- [ ] A Push-to-talk hold and a typed message during Thinking queue the same way, replacing today's "ignored"
- [ ] When the pending Reply arrives, it is appended as an Interrupted Reply (never spoken), not spoken, and the queued message is sent at once with the unspoken mark on its request
- [ ] A placeholder queued cue on the Orb, and the queued-speech sound if ticket 03 has landed
- [ ] Session tests cover speech, a hold and a typed message during Thinking, joining, and the shown-not-spoken Reply
