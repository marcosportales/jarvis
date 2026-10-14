# 01: Move the database out of Plugins

**What to build:** A prefactor with no visible change. The SQLite database module (open, migrate, schema, migrations folder) moves from Plugins to a shared place so Sessions and Memories can add tables to the same database. Same database file, same `JARVIS_DB_PATH` env var, and one migrations folder. Plugins keeps working exactly as before. See `.scratch/sessions/spec.md` → "Shared database".

**Blocked by:** None (can start immediately)

**Status:** done

- [x] One shared database module and schema; Plugins imports from it
- [x] An existing `.data/jarvis.db` opens and migrates without losing Installed Plugins
- [x] drizzle-kit config points at the shared schema and migrations
- [x] Plugins tests pass unchanged (apart from imports)
- [x] Lint, typecheck and tests pass
