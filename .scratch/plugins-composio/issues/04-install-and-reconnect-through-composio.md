# 04: Install and Reconnect through Composio

**What to build:** Clicking Instalar or Reconectar on `/plugins` sends the Owner to the consent screen Composio returns (Composio's verified Google app for Gmail, with no Google Cloud project of ours), then back through our callback to `/plugins`, where Gmail shows Conectado. The workflow and messages are the same as today:
- A fresh `state` goes into the same httpOnly pending-install cookie and into the callback URL given to Composio. A callback whose `state` doesn't match is rejected as today.
- On return, Composio is asked for the account's status. Only `ACTIVE` counts as installed.
- A cancelled consent, a provider error, or an account that isn't active leaves Gmail Disponible with the existing message, and the `INITIATED` account it left behind is deleted.
- After a successful Install or Reconnect, Gmail's other accounts that don't work are deleted, so one working connection remains.

**Blocked by:** 03 (Marketplace shows Plugin states from Composio)

**Status:** ready-for-human (implemented; only the manual check against real Gmail remains, after ticket 02)

- [x] Instalar and Reconectar redirect to Composio's consent URL
- [x] Successful return → Conectado, with the "conectado" message
- [x] Cancelled, failed, non-active and `state`-mismatch returns behave as today, and abandoned attempts are cleaned up
- [x] Stale accounts are removed after Reconnect
- [x] Plugins module tests cover each case with the fake Composio port
- [ ] Manual (after 02): installing Gmail against the real account shows Conectado
- [x] Lint, typecheck and tests pass
