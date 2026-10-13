# 06: Failures mid-Turn and Reconnect

**What to build:** Plugin problems never break a Turn. Expired access tokens are refreshed transparently. If a Connector fails while loading tools or during a tool call, the model receives a failure description instead of an exception, so Jarvis explains in one sentence ("No pude acceder a Gmail; quizá debas reconectarlo") and the Turn ends with a normal Reply. If authorization fails for good (refresh rejected, access revoked), the Plugin stays Installed but is no longer Connected; `/plugins` shows Reconnect, which re-runs the OAuth flow and returns it to Connected.

**Blocked by:** 05 (Jarvis answers questions about Gmail)

**Status:** done

**Note:** Closed without running the real-Gmail checks. The Owner can't get the Google Cloud project into the Google Workspace Developer Preview Program, which the Gmail MCP server requires (see ticket 02), so every Gmail tool call against real Google fails. The code paths are covered by the Plugins module tests with fakes.

- [x] Expired access token is refreshed and the new token stored, without the Owner noticing
- [x] Connector failure at tool-load or tool-call time yields a model-visible explanation, not a thrown error
- [x] Auth failure marks the Plugin not Connected; `/plugins` shows Reconnect
- [x] Reconnect runs OAuth again and restores Connected
- [x] Plugins module tests with fake Connector/OAuth cover refresh, Connector failure, auth failure, and reconnect
- [ ] Manual (needs ticket 02): after revoking access in the Google account, an email question gets a one-sentence explanation and Gmail shows Reconnect
