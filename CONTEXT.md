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
One saved conversation between the Owner and Jarvis, kept until the Owner deletes it. The Owner can start a new one, resume any earlier one, or delete it; a Session exists only once its first Turn is done.
_Avoid_: Chat, thread, history, conversation

**Session Title**:
The short name Jarvis gives a Session after its first Turn, shown in the Session list.
_Avoid_: Name, label, subject

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

### Memory

**Memory**:
One durable fact about the Owner that Jarvis keeps across all Sessions, e.g. a preference, a person in their life, a place, a routine, or a standing instruction. Not something Jarvis can look up through a Plugin, and not something only true for now.
_Avoid_: Note, fact, observation, knowledge

**Remember** / **Forget**:
Jarvis saving or deleting a Memory, either because the Owner asked or, for remembering, because Jarvis judged it worth keeping, in which case it says so. Deleting a Session never forgets its Memories.
_Avoid_: Store, save, learn

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
A unit the Owner installs from the Marketplace to give Jarvis access to one outside service, e.g. the Gmail Plugin. It bundles one or more Connectors and, eventually, Skills and Widgets.
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

### Widgets

**Widget**:
A small floating panel on the Jarvis page showing one thing at a glance, e.g. the Weather Widget. Built into Jarvis today; later, a Plugin may also bring Widgets.
_Avoid_: Panel, card, overlay, gadget

**Shown** / **Hidden**:
Whether a Widget is currently on screen. Both the Owner and Jarvis can show or hide any Widget, and the choice is kept across Sessions. Closing a Widget means hiding it.
_Avoid_: Open, enabled, active

**Spot**:
One of six named places in the side margins of the Jarvis page — left or right, each top, middle or bottom — where Jarvis can move a Widget. The Owner can instead drag a Widget anywhere on screen.
_Avoid_: Slot, zone, corner

**Starting Spot**:
Where a Widget first appears before it has ever been moved, e.g. top-right for the Weather Widget. A Widget without one first appears at a random free place in the side margins.
_Avoid_: Default position

**Widget Setting**:
A choice about what a Widget shows that Jarvis can change, e.g. the Weather Widget's place. Kept like the Widget's position.
_Avoid_: Option, config, parameter
