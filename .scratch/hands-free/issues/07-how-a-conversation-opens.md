# 07: How a conversation opens: always listening, a wake word, or a toggle?

Type: grilling
Status: resolved
Blocked by: 01, 04, 05

## Question

When the Owner isn't holding anything, what decides that their speech is meant for Jarvis?
- **Always listening:** every stretch of speech the voice detection hears becomes an Utterance.
- **Wake word:** only speech that starts with "Jarvis…" does, perhaps with a short follow-up window after a Reply in which no wake word is needed.
- **Toggle:** the Owner switches hands-free on and off (with the Orb, a key, or their voice), and while it's on it behaves like always listening.
- A mix, e.g. a toggle plus a wake word.

Also: is Push-to-talk kept as a fallback, and with which inputs (the Orb, Space, the global key)? Is the answer the same on the Jarvis page and in the Jarvis App?

## Answer

**A toggle.** The Owner switches hands-free on and off. While it's on, the mic is open and every stretch of speech voice detection hears becomes an Utterance. While it's off, the mic is closed. Once on, it stays on across any number of Turns and any length of silence until the Owner turns it off. Waiting costs almost nothing (local voice detection, no Nan calls).

**Inputs: tap toggles, hold talks, on all three.** A short press of the Orb, of Space on the Jarvis page, or of the global key in the Jarvis App switches hands-free on or off. A press held past about 300 ms is Push-to-talk, as today. The portal's global shortcut already reports press and release, so the global key can tell a tap from a hold too.

**Push-to-talk stays as a fallback,** whether hands-free is on or off: for a noisy room, other voices, or speaking once without opening the mic. If hands-free is off, the mic closes again on release.

**The same on the Jarvis page and in the Jarvis App.** They differ only in what each can reach (the global key, the Floating Orb).

**Not in this effort:**
- **Wake word.** Nothing usable exists for a Spanish speaker (see **Can a wake word ("Jarvis…") be detected locally?**). The Owner is happy to talk to Jarvis in English and wants to switch Jarvis to English as a separate effort. After that, openWakeWord's `hey_jarvis` (its non-commercial licence fits a single Owner; it needs a browser ONNX port) or Porcupine's `jarvis` (needs an AccessKey, no personal plan) become candidates. The wake word becomes a follow-up that adds "only speech after 'Hey Jarvis' counts while hands-free is on". The toggle stays useful after that as the way to close the mic.
- **Turning hands-free off by voice** ("Jarvis, stop listening"). A tap does the same job. It fits with the wake word follow-up.

**Left to other tickets:**
- Whether hands-free stays on after a restart and starts on with the computer: **Privacy: when is the mic open, and how does the Owner know?**
- The name for "hands-free is on" and the waiting Jarvis State: **Domain: Utterance, Listening, Push-to-talk and a waiting Jarvis State**.
