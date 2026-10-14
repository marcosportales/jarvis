# 06: Uninstall deletes the Composio connection

**What to build:** Clicking Desinstalar on `/plugins` deletes every one of Gmail's connected accounts at Composio. Gmail then shows Disponible with the existing "se desinstaló" message, and Jarvis no longer has access. This works from Conectado and from Desconectado. Revoking the grant at Google is left to Composio; a failure while deleting is logged and shown as an error rather than claiming success.

**Blocked by:** 03 (Marketplace shows Plugin states from Composio)

**Status:** ready-for-agent

- [ ] Uninstall removes all of the toolkit's accounts, from both Conectado and Desconectado
- [ ] Plugins module tests cover it with the fake Composio port
- [ ] Manual (after 02, 04, 05): after Uninstall, "¿Tengo correos sin leer?" gets "No tengo acceso a tu Gmail" or equivalent
- [ ] Lint, typecheck and tests pass
