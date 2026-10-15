# Idea: Faster Turns

Status: idea, not yet charted

Cut Thinking, the time from a Turn being sent to the first sound of the Reply, beyond what hands-free conversation already does. Hands-free starts Plugin setup during the Utterance and plays an acknowledgement sound when a Turn is sent (see `.scratch/hands-free/issues/11-shorten-thinking-scope.md`). The rest was left to this effort.

What it could touch, with the savings measured in `.scratch/hands-free/issues/06-where-the-gap-goes.md`:
- **Fewer chat model calls per Turn.** Each Nan chat call costs about 2–3 s whatever the prompt size, and a tool Turn makes three (e.g. `get_weather`, then `show_widget`, then the Reply). Showing a Widget without its own call would save about 2–3 s on those Turns. This is the biggest saving left.
- **Keep Plugin setup warm across Turns** instead of setting it up for each Turn. It would also make typed messages faster, but needs a rule for when to refresh it (a Plugin connected or disconnected, the Composio session expiring).
- **Speak the Reply sentence by sentence as it streams.** At most 1–2 s, and only on long Replies. Most of a chat call is waiting for the first token.
- **Tail risk:** 2 of 20 streamed replays waited about 95 s at Nan for the first token. A timeout or retry policy belongs here.
