# Jarvis

A personal voice assistant: the Owner speaks, Jarvis answers out loud, in Spanish. Jarvis reaches outside services (Gmail, Calendar, Linear…) only through Plugins the Owner has installed.

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

### Plugins

**Marketplace**:
The fixed catalog of Plugins the Owner can choose from. The Owner cannot add arbitrary entries.
_Avoid_: Store, app directory, integrations page

**Plugin**:
A unit the Owner installs from the Marketplace to give Jarvis access to one outside service, e.g. the Gmail Plugin. It bundles one or more Connectors and, eventually, Skills.
_Avoid_: Integration, app, extension

**Connector**:
The part of a Plugin that links Jarvis to an outside service so Jarvis can read from or act on it. Each Plugin has exactly one for now.
_Avoid_: Server, MCP, integration

**Skill**:
Guidance a Plugin gives Jarvis on how to use its Connectors well. Named here so it isn't confused with Connector; no Plugin has Skills yet.
_Avoid_: Prompt, instruction

**Installed**:
A Plugin the Owner has chosen from the Marketplace. Installed alone does not mean Jarvis can use it.

**Connected**:
An Installed Plugin whose Connector the Owner has authorized and that currently works. Jarvis can only use Connected Plugins.
_Avoid_: Enabled, active, linked
