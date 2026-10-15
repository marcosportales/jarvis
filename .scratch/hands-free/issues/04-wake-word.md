# 04: Can a wake word ("Jarvis…") be detected locally?

Type: research
Status: open
Blocked by: none
Findings: branch `research/hands-free-wake-word`, file `.scratch/hands-free/research/wake-word.md`

## Question

If the Owner opened each conversation by saying "Jarvis…", could that word be detected locally in the browser and in Electron, without sending audio anywhere until it is heard?

Cover openWakeWord (ONNX), Picovoice Porcupine (Web SDK) and any other credible option:
- Whether "Jarvis" is available or trainable, and how it performs with a Spanish speaker and Spanish sentences around it.
- CPU cost while waiting, false accepts per hour, false rejects.
- Licensing and cost (Porcupine needs an access key and has usage terms), and whether it runs offline.
- How it fits with voice detection: one model or two, and whether the words after "Jarvis" in the same breath can stay part of the Utterance.

This only informs a choice; it does not assume a wake word will be used.
