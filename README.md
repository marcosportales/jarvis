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
