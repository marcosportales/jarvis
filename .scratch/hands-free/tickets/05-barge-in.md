# 05: Barge-in while Speaking on the Jarvis page

**What to build:** On the Jarvis page with Hands-free on, the Owner can talk over a Reply to cut it short, the way they'd cut off a person. A cough or an "mm-hm" doesn't count; about half a second of speech does. What they said becomes the next Utterance. A tap while Speaking only stops the Reply and leaves Hands-free as it was; a hold still cuts it and starts Push-to-talk. In the Jarvis App, barge-in stays off until its echo has been measured.

**Blocked by:** 02: A hands-free Turn on the Jarvis page; 04: Interrupted Reply, end to end

**Status:** ready-for-agent

Spec: [Hands-free conversation](../spec.md)

- [ ] While Speaking, the Listener uses a stricter gate: about 500–600 ms of continuous speech before speech counts (configurable)
- [ ] Speech that passes it stops the Voice, marks the Reply "cut short" with its share, and becomes the next Utterance with its pre-roll kept
- [ ] A tap while Speaking stops the Reply only; Hands-free stays on or off as it was
- [ ] A barge-in setting: on for the Jarvis page, off for the Jarvis App, where the Listener reports nothing while Speaking (half duplex); a tap or a hold still cuts the Reply there
- [ ] The Orb has a placeholder Speaking look showing that a tap stops the Reply
- [ ] Session tests cover barge-in, a tap while Speaking, a hold while Speaking, and half duplex ignoring Listener events
