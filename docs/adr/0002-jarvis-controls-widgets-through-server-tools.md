# Jarvis controls Widgets through server-side tools

Jarvis shows, hides and moves Widgets by calling tools during the Reply on the server (`show_widget`, `hide_widget`, `move_widget`, generated from the Widget registry). The Reply route returns the resulting Widget changes alongside the text, and the client applies them. The client sends the current Widget layout with every Turn so Jarvis knows what is Shown and where. We chose this over parsing the Owner's intent on the client (brittle, needs new phrases per Widget) and over a separate classifier call (extra latency, duplicates the model's understanding), so that adding a Widget is a registry entry, not new control logic.

## Consequences

- The Brain contract changes from returning a string to returning the Reply text plus Widget changes.
- Widget changes are only applied once the whole Reply is ready, not mid-Turn.
