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

### The Jarvis App (packaged)

The packaged Jarvis App runs Jarvis's server itself, so no terminal is needed. Build it with one command at the root:

```bash
pnpm package:app
```

That builds the web app (Next's standalone output) and packages `apps/desktop/release/Jarvis-<version>.AppImage`. AppImages need FUSE 2 on Arch (`sudo pacman -S fuse2`). Install it as `jarvis`, with a launcher entry:

```bash
install -Dm755 apps/desktop/release/Jarvis-*.AppImage ~/.local/bin/jarvis
install -Dm644 apps/desktop/assets/icon.png ~/.local/share/icons/hicolor/512x512/apps/jarvis.png
cat > ~/.local/share/applications/Jarvis.desktop <<EOF
[Desktop Entry]
Name=Jarvis
Comment=Jarvis, tu asistente de voz
Exec=$HOME/.local/bin/jarvis %U
Icon=jarvis
Terminal=false
Type=Application
Categories=Utility;
StartupWMClass=Jarvis
EOF
```

Its keys live in `~/.config/Jarvis/jarvis.env`, with the same lines as `apps/web/.env.local` (`NAN_API_KEY`, `COMPOSIO_API_KEY`, the optional overrides). `#` comments, blank lines and quoted values are fine:

```bash
mkdir -p ~/.config/Jarvis
cp apps/web/.env.local ~/.config/Jarvis/jarvis.env
chmod 600 ~/.config/Jarvis/jarvis.env
```

Its Sessions and Memories are in `~/.config/Jarvis/jarvis.db`, apart from the development database, and migrations run on every start. The server's output goes to `~/.config/Jarvis/jarvis.log`; if Jarvis can't start (the port is taken, a bad key file…), an error says why and points there. It listens only on this computer, at http://127.0.0.1:3737, where a browser tab shows the same Jarvis. Set `JARVIS_PORT` (in the environment or in `jarvis.env`) to use another port.

To start it hidden when Hyprland starts, add to `hyprland.conf` (use the full path, `~/.local/bin/jarvis`, if that folder isn't on Hyprland's `PATH`):

```
exec-once = jarvis --hidden
```

Launching `jarvis` again shows the window; `jarvis --quit` quits Jarvis and its server.

### Push-to-talk from any app

In the Jarvis App, holding `SUPER + J` while any other app is focused works like holding Space on the Jarvis page: hold to speak, release to send. The Jarvis window stays hidden or behind, and your app keeps focus. The key goes through the desktop portal's Global Shortcuts (`xdg-desktop-portal-hyprland` on Hyprland), which knows Jarvis by its app id `Jarvis`. The portal only accepts it with `~/.local/share/applications/Jarvis.desktop` installed (as above; in dev mode too, where any `Exec` line will do).

Then bind the key to Jarvis's `push-to-talk` shortcut. In `hyprland.conf`:

```
bind = SUPER, J, global, Jarvis:push-to-talk
```

or, with a Lua config (`hyprland.lua`):

```lua
hl.bind("SUPER + J", hl.dsp.global("Jarvis:push-to-talk"))
```

`hyprctl globalshortcuts` lists `Jarvis:push-to-talk` while the Jarvis App runs. If the portal or the shortcut isn't available, the Jarvis App still runs and says why in its output; only this key is missing.

### The Floating Orb

While the Jarvis App runs, it also shows the Floating Orb: the Orb alone in a small transparent window, showing the Jarvis State. Hold it with the mouse to speak, as with the Orb on the Jarvis page; a short click brings up the Jarvis window. It never takes focus from your app.

Electron gives all of the Jarvis App's windows the same class, `Jarvis`, so the Floating Orb is told apart by its fixed title, `Jarvis Floating Orb`. These window rules float it, pin it above other windows on every workspace, keep focus out of it, and place it at the bottom right. Put them after your other window rules, so they win over any catch-all rule that sizes, centres or dims floating windows. In `hyprland.conf`:

```
windowrule = match:class ^Jarvis$, match:title ^Jarvis Floating Orb$, float on, pin on, no_focus on, size 96 96, move (monitor_w-120) (monitor_h-120), border_size 0, no_shadow on, no_blur on, opacity 1 override
```

or, with a Lua config (`hyprland.lua`):

```lua
hl.window_rule({
    name        = "jarvis-floating-orb",
    match       = { class = "^Jarvis$", title = "^Jarvis Floating Orb$" },
    float       = true,
    pin         = true,
    no_focus    = true,
    size        = "96 96",
    move        = "(monitor_w-120) (monitor_h-120)",
    center      = false,
    border_size = 0,
    no_shadow   = true,
    no_blur     = true,
    opacity     = "1 override",
})
```

`hyprctl clients` shows it as `class: Jarvis`, `title: Jarvis Floating Orb`.

## Plugins

Open http://localhost:3000/plugins to see the Marketplace. Plugins reach their services through [Composio](https://composio.dev) (ADR 0005), which holds the Owner's authorizations; Jarvis stores no tokens.

Setup is one Composio API key: create a Composio account and project, create an API key, and add it to `apps/web/.env.local`:

```bash
COMPOSIO_API_KEY=...
```

Without it, every Plugin shows "No configurado". Sessions and Memories live in a local SQLite file, `apps/web/.data/jarvis.db` (gitignored; override with `JARVIS_DB_PATH`).

After schema changes, regenerate migrations with `pnpm --filter web exec drizzle-kit generate`.
