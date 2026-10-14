# Jarvis

A personal voice assistant: the Owner speaks, Jarvis answers out loud, in Spanish. Jarvis reaches the Owner's own accounts (Gmail, Calendar, Linear…) only through Plugins the Owner has installed. Abilities that need no authorization from the Owner, such as the weather or searching the web, are built into Jarvis itself.

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
What Jarvis says back in a Turn — shown as text and spoken aloud — including what it says while it uses its tools, e.g. "déjame mirarlo". Jarvis starts speaking it, a sentence at a time, before it has finished writing it, and the Transcript shows each part as it is spoken.
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
The way the Owner speaks to Jarvis: hold to capture an Utterance, release to send it. Held on the Orb or with Space on the Jarvis page and, in the Jarvis App, also with a key from any other app.
_Avoid_: Recording mode, listen mode

**Orb**:
The round button the Owner holds for Push-to-talk, which also shows the Jarvis State.
_Avoid_: Button, mic, sphere

**Jarvis State**:
What Jarvis is doing right now — exactly one of Idle, Listening, Thinking, or Speaking.
_Avoid_: Status, mode

**Listening**:
The Jarvis State while push-to-talk is held and an Utterance is being captured.

**Thinking**:
The Jarvis State from the end of an Utterance (or a typed message) until the Reply starts being spoken.
_Avoid_: Transcribing, processing, loading

**Speaking**:
The Jarvis State while the Reply is being played aloud, from its first spoken sentence on, even while Jarvis is still writing the rest. Starting push-to-talk cuts it short: the voice stops at once, but the Reply is still finished, saved and shown in full, and the Owner's next message waits for it.

**Idle**:
The Jarvis State when none of the others apply.

### The Jarvis App

**Jarvis App**:
Jarvis running as its own app on the Owner's computer instead of a browser tab: it starts with the computer, keeps running with its window closed, and lets the Owner hold Push-to-talk from any other app. It is the same Jarvis, with the same Sessions, Memories and Widgets, that a browser tab on the same computer reaches.
_Avoid_: Desktop app, Electron app, desktop client, wrapper

**Floating Orb**:
The Orb in a small window of its own that the Jarvis App keeps above every other app, so the Owner sees the Jarvis State and can hold Push-to-talk without the Jarvis page in view. It holds nothing else; it is not a Widget.
_Avoid_: Mini window, overlay, bubble, widget

### Plugins

**Marketplace**:
The fixed catalog of Plugins the Owner can choose from. The Owner cannot add arbitrary entries.
_Avoid_: Store, app directory, integrations page

**Plugin**:
A unit the Owner installs from the Marketplace to give Jarvis access to one outside service, e.g. the Gmail Plugin. It bundles one or more Connectors, may bring Widgets (e.g. the Google Calendar Plugin brings the Calendar Widget) and, eventually, Skills.
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
A floating panel on the Jarvis page showing one thing, e.g. the Weather Widget. Either built into Jarvis, or brought by a Plugin, in which case it exists only while that Plugin is Connected.
_Avoid_: Panel, card, overlay, gadget

**Shown** / **Hidden**:
Whether a Widget is currently on screen. Both the Owner and Jarvis can show or hide any Widget, and the choice is kept across Sessions. Closing a Collapsed Widget means hiding it; hiding an Expanded one collapses it first.
_Avoid_: Open, enabled, active

**Expanded** / **Collapsed**:
How a Shown Widget is on screen. Collapsed is its usual small form at its place; Expanded is the same Widget shown large in the middle of the page, over the others, while the Owner can still talk to Jarvis. At most one Widget is Expanded at a time, so expanding another collapses the first. Both the Owner and Jarvis can expand or collapse a Widget, but Jarvis only does it when the Owner asks; a Widget never expands itself. Expanding a Hidden Widget also shows it, and moving an Expanded Widget collapses it at its new place. Closing an Expanded Widget collapses it back to its place, still Shown. Every page load starts with all Widgets Collapsed.
_Avoid_: Dialog, modal, fullscreen, maximized, popup, open

**Expandable**:
A Widget that can be Expanded, e.g. the Results, Browser, Calendar and Map Widgets, but not the Weather or Today Widgets.

**Spot**:
One of six named places in the side margins of the Jarvis page — left or right, each top, middle or bottom — where Jarvis can move a Widget. The Owner can instead drag a Widget anywhere on screen.
_Avoid_: Slot, zone, corner

**Starting Spot**:
Where a Widget first appears before it has ever been moved, e.g. top-right for the Today Widget, or directly below another Widget, e.g. the System Widget below the Weather Widget, falling back to a Spot when that one is Hidden or there is no room. A Widget without one first appears at a random free place in the side margins.
_Avoid_: Default position

**Widget Setting**:
A choice about what a Widget shows that Jarvis can change, e.g. the Weather Widget's place. Kept like the Widget's position.
_Avoid_: Option, config, parameter

### The web

**Search**:
Jarvis looking something up on the public web during a Turn, e.g. flights, hotels, news or prices, and answering in the same Reply. Built into Jarvis; never logs in, books or buys.
_Avoid_: Web search plugin, lookup, query

**Results Widget**:
The Widget where Jarvis lays out what a Search found, with links the Owner can open, while the Reply only sums it up out loud.
_Avoid_: Search panel, results page

**Browse**:
Jarvis handing a read-only task to a remote browser that works through real websites on its own, for when a Search cannot answer. Jarvis only proposes it; it starts once the Owner agrees. It never logs in, fills in the Owner's details, books or pays.
_Avoid_: Scrape, crawl, automate, browser agent

**Browse Task**:
One piece of Browse work, from the Owner agreeing until it finishes, fails or is stopped. It outlives the Turn that started it, and there is at most one at a time: starting another stops the first.
_Avoid_: Job, run, session

**Browser Widget**:
The Widget where the Owner watches the current Browse Task live, can stop it, and finds its outcome once it is done. Hiding it does not stop the Browse Task.
_Avoid_: Browser, viewer, live view

### Today

**Today Widget**:
The Widget showing today's date with its weekday and the time of day in 24-hour form, always for where the Owner is. Built into Jarvis.
_Avoid_: Clock, date widget, today's info

### System

**System Widget**:
The Widget showing how busy the computer Jarvis runs on is right now (CPU, RAM and, if it has one, its battery) together with Jarvis Health. Built into Jarvis, not a Plugin. Jarvis Shows it on its own when a Reply is about the computer or about whether Jarvis is working, but never brings these up unasked.
_Avoid_: System monitor, stats, dashboard, system plugin

**Jarvis Health**:
Whether Jarvis's own parts are working, as one of Working, Limited or Down, overall and for each part. It is checked now and then and also changes as soon as a part fails during a Turn. The Owner's Plugins don't count one by one: whether one needs reconnecting is the Marketplace's business; only reaching Plugins and Search at all is a part. Not the same as Jarvis State, which is what Jarvis is doing.
_Avoid_: Status, uptime, system status

**Working** / **Limited** / **Down**:
The three levels of Jarvis Health. Working: every part works. Limited: Jarvis can still hold a Turn, but some abilities fail, e.g. Search, Plugins, the weather, the map or Browse. Down: the Owner cannot hold a Turn because understanding, thinking, speaking or remembering has failed.
_Avoid_: OK, degraded, error, offline

### Calendar

**Agenda**:
Everything on the Owner's plate for a given day, made of Agenda Items.
_Avoid_: Schedule, planner, to-do list

**Agenda Item**:
One thing on the Owner's Agenda, e.g. a meeting, the shopping or delivering a product, with a time or for the whole day. It comes from somewhere the Owner keeps such things; today only events from the Owner's Google Calendar.
_Avoid_: Task, event, to-do, reminder (as the general term)

**Calendar Widget**:
The Widget showing the Agenda: one day's Agenda Items when Collapsed, a week or a month when Expanded. Brought by the Google Calendar Plugin, so it exists only while that Plugin is Connected. Jarvis Shows it on its own, at the day asked about, when a Reply is about the Owner's Agenda. Every page load starts it back on today.
_Avoid_: Calendar (alone), agenda panel

### Maps

**Map Widget**:
The Widget with a live map the Owner and Jarvis both work on: finding places, putting Markers and planning Routes. Built into Jarvis. Finding places is the Map's job, not Search's: what it finds becomes Markers. Jarvis Shows it on its own when a Reply is about a place or a way to get somewhere. Its Markers, Route and view are kept until replaced or cleared.
_Avoid_: Google Maps, maps plugin

**Marker**:
A pin on the Map Widget for one place. Not a place saved in the Owner's Google account.
_Avoid_: Pin, saved place, favourite

**Route**:
The way from one place to another by car, on foot, by public transport or by bike, with how long it takes and how far it is, drawn on the Map Widget. Without a starting place it starts where the Owner is. At most one at a time; a new one replaces it.
_Avoid_: Directions, itinerary, navigation
