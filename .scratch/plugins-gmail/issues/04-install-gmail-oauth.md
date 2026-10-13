# 04: Install Gmail through OAuth, so it's Connected

**What to build:** On `/plugins`, the Owner clicks Install on Gmail, is sent to Google's consent screen, approves, and lands back on `/plugins` with Gmail shown as Connected. Install and connect are one action: if the Owner cancels or OAuth fails, nothing is Installed and a clear message is shown. Tokens (access, refresh, expiry) are stored server-side and never reach the browser. Uses the values confirmed in ticket 01 for the catalog entry. Adds *begin install* and *complete install* to the Plugins module, with the OAuth provider injected.

**Blocked by:** 01 (Confirm Google's Gmail MCP server against official docs), 03 (Marketplace page lists the Gmail Plugin)

**Status:** done (manual check pending ticket 02)

- [x] Install redirects to the provider's consent URL with the read-only scope and CSRF-safe state
- [x] OAuth callback stores the Installed Plugin and its tokens; Gmail then shows Connected
- [x] Cancelled/failed OAuth or invalid state leaves Gmail not Installed and shows a message
- [x] Plugins module tests with a fake OAuth provider cover success, cancel, and failure
- [ ] Manual (needs ticket 02): installing against real Google ends with Gmail Connected and surviving a server restart
