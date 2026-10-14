# 04: Gather the Widget definition into one module

**Strength:** Speculative · **Dependencies:** in-process

**Status:** needs-triage

**Blocked by:** None. Revisit when Plugin Widgets (ADR-0003) start.

**Files:** `apps/web/lib/widgets/board.ts`, `changes.ts`, `catalog.ts`, `tools.ts`, `registry.ts`

**Problem:** Understanding "Widget" means bouncing across seven files:
- `changes.ts` imports `SPOTS` from `board.ts`, and `board.ts` imports types from `changes.ts`.
- Widget Settings are validated twice: at tool-call time in `tools.ts` and again in `board.ts` `parseSettings`.

**Solution:** One module with no React in it owns Spots, Widget Settings validation, and the change and layout shapes. `board`, `tools` and `registry` depend on it and never on each other.

**Why speculative:** `board.ts` is already deep (about 10 methods, 36 tests). This pays off only once Plugin Widgets add a second kind of Widget.

## Comments
