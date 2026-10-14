# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Running Jarvis

Create `apps/web/.env.local` with your Nan Builders key (it is only read on the server):

```bash
NAN_API_KEY=...
# Optional overrides; confirm the IDs with GET https://api.nan.builders/v1/models
# NAN_CHAT_MODEL=deepseek-v4-flash
# NAN_TRANSCRIPTION_MODEL=whisper-1
# NAN_SPEECH_MODEL=kokoro
# NAN_VOICE=em_alex
# City for the weather when the Owner's location is unknown (default Madrid).
# Add ",<country code>" to pick between namesakes, e.g. Cordoba,ES (Spain, not Argentina)
# JARVIS_WEATHER_FALLBACK_CITY=Madrid
```

Then run `pnpm dev` and open http://localhost:3000. Hold the orb (or Space) to talk.

Run the Jarvis Session tests with `pnpm --filter web test`, or every test with `pnpm test`.

### The Jarvis App (dev mode)

`pnpm dev:app` runs `next dev` and opens the Jarvis App on it: Jarvis in its own window, shown once the page answers. Closing the window hides it and Jarvis keeps running; launching it again (`pnpm --filter desktop exec electron .`) brings it back, and `pnpm --filter desktop exec electron . --quit` (or the tray's "Salir", if your desktop has a tray) quits it. `pnpm dev` alone still starts only the web app.

## Plugins

Open http://localhost:3000/plugins to see the Marketplace. Plugins reach their services through [Composio](https://composio.dev) (ADR 0005), which holds the Owner's authorizations; Jarvis stores no tokens.

Setup is one Composio API key: create a Composio account and project, create an API key, and add it to `apps/web/.env.local`:

```bash
COMPOSIO_API_KEY=...
```

Without it, every Plugin shows "No configurado". Sessions and Memories live in a local SQLite file, `apps/web/.data/jarvis.db` (gitignored; override with `JARVIS_DB_PATH`).

After schema changes, regenerate migrations with `pnpm --filter web exec drizzle-kit generate`.
