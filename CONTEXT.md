# Jarvis

A personal voice assistant: the Owner speaks, Jarvis answers out loud, in Spanish. The MVP is conversation only — no actions in the world.

## Language

### People

**Owner**:
The single person Jarvis serves. There are no other users and no accounts.
_Avoid_: User, customer, account

**Jarvis**:
The assistant persona the Owner talks to — its name, personality, and voice.
_Avoid_: Bot, agent, AI

### Conversation

**Session**:
One continuous conversation between the Owner and Jarvis. It ends when the page is closed or reloaded; nothing carries over.
_Avoid_: Chat, thread, history

**Turn**:
One Utterance (or typed message) from the Owner together with Jarvis's Reply to it.
_Avoid_: Exchange, round

**Utterance**:
A single stretch of the Owner's speech, captured while push-to-talk is held.
_Avoid_: Recording, clip, voice message

**Reply**:
What Jarvis says back in a Turn — shown as text and spoken aloud.
_Avoid_: Response, answer, completion

**Transcript**:
The visible text record of every Turn in the current Session.
_Avoid_: Log, history

### Voice

**Push-to-talk**:
The way the Owner speaks to Jarvis: hold to capture an Utterance, release to send it.
_Avoid_: Recording mode, listen mode

**Jarvis State**:
What Jarvis is doing right now — exactly one of Idle, Listening, Thinking, or Speaking.
_Avoid_: Status, mode

**Listening**:
The Jarvis State while push-to-talk is held and an Utterance is being captured.

**Thinking**:
The Jarvis State from the end of an Utterance (or a typed message) until the Reply starts being spoken.
_Avoid_: Transcribing, processing, loading

**Speaking**:
The Jarvis State while the Reply is being played aloud. Starting push-to-talk cuts it short.

**Idle**:
The Jarvis State when none of the others apply.
