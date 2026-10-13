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
```

Then run `pnpm dev` and open http://localhost:3000. Hold the orb (or Space) to talk.

Run the Jarvis Session tests with `pnpm --filter web test`.

## Plugins

Open http://localhost:3000/plugins to see the Marketplace. Installed Plugins and their OAuth tokens are kept in a local SQLite file, `apps/web/.data/jarvis.db` (gitignored; override with `JARVIS_DB_PATH`).

The Gmail Plugin needs a Google OAuth client (see `.scratch/plugins-gmail/issues/02-google-cloud-oauth-client.md`):

1. Enroll your **Google Cloud project** in the [Google Workspace Developer Preview Program](https://developers.google.com/workspace/preview). Without it, every Gmail MCP tool call is refused.
2. In a Google Cloud project, enable the **Gmail API** and the **Gmail MCP API**.
3. Configure the OAuth consent screen, add yourself as a test user, and add the scope `https://www.googleapis.com/auth/gmail.readonly`.
4. Create an OAuth client of type **Web application** with the redirect URI `http://localhost:3000/api/plugins/callback`.
5. Add its credentials to `apps/web/.env.local`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

After schema changes, regenerate migrations with `pnpm --filter web exec drizzle-kit generate`.
