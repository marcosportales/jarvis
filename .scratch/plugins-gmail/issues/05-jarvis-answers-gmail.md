# 05: Jarvis answers questions about Gmail

**What to build:** With Gmail Connected, the Owner asks Jarvis (by voice or typing) about their email and gets a short spoken Reply grounded in their real inbox, including follow-ups ("¿y qué decía el de Ana?"). Adds *tools for a Turn* to the Plugins module: it returns the allowlisted tools of every Connected Plugin, obtained through each Plugin's Connector (remote MCP via the AI SDK MCP client, per ADR 0001), with the Connector injected so tests use a fake. The Reply step passes those tools to the chat model with bounded multi-step tool use (~5 steps); its response to the client stays the full Reply text, so the Jarvis Session controller and Transcript are unchanged and the Jarvis State stays Thinking throughout. Tool calls are not shown in the Transcript. The system prompt gains: summarise email for speech (senders by name, never email addresses or links, a count plus the top two or three when there are many), and say plainly when a service isn't Connected instead of inventing an answer.

**Blocked by:** 04 (Install Gmail through OAuth, so it's Connected)

**Status:** ready-for-agent

- [ ] Tools for a Turn returns only allowlisted tools, only from Connected Plugins; none when nothing is Connected
- [ ] Reply step uses those tools with a step limit; client contract unchanged
- [ ] System prompt covers speaking about email and admitting missing access
- [ ] Plugins module tests with a fake Connector cover the above
- [ ] Manual (needs ticket 02): "¿Tengo correos sin leer de hoy?" by voice gets a 1–3 sentence spoken answer matching the real inbox
- [ ] Manual: with Gmail not Installed, Jarvis says it has no access to Gmail
