# 02: Prompt rules travel with their capability; Gmail's become a Skill

**Strength:** Worth exploring · **Dependencies:** in-process

**Status:** needs-triage

**Blocked by:** 01 (re-check after it lands; it builds on 01's capability shape)

**Files:** `apps/web/lib/jarvis/server/system-prompt.ts`, `lib/plugins/catalog/gmail.ts`, `lib/memory/tools.ts`, `lib/widgets/tools.ts`, `lib/widgets/catalog.ts`, `lib/weather/tool.ts`

**Problem:** The static system prompt holds the rules for every capability. The Plugin catalog can grow, but the prompt can't:
- The "Correo" rules are hard-coded and sent even when Gmail isn't Connected.
- Weather's rules are split three ways: the prompt, the Widget catalog's settings schema, and the "no cambies ningún widget" string in the tool.

**Solution:** Each capability owns its prompt rules next to its tools. A Plugin's rules become that Plugin's **Skill** (the term is already in CONTEXT.md) and reach the prompt only when the Plugin is Connected.

**Wins:**
- Locality: each tool sits next to its rules.
- A new Plugin is a catalog entry plus a Skill.

## Comments
