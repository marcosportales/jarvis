// Gathers Jarvis's server for packaging into `.stage/server`: the web app's
// standalone output (traced from the monorepo root, migrations included),
// plus the static assets and `public` folder Next leaves out of it.
//
// better-sqlite3 needs no rebuild for Electron: its prebuilt binary is a
// Node-API addon, which loads in Electron's Node as it is. This checks that
// the binary is there rather than compiling anything.

import { cpSync, existsSync, readdirSync, rmSync } from "node:fs"
import path from "node:path"

const desktop = path.join(import.meta.dirname, "..")
const web = path.join(desktop, "../web")
const standalone = path.join(web, ".next/standalone")
const stage = path.join(desktop, ".stage/server")
/** Where `server.js` sits in the standalone output, as in the monorepo. */
const appDir = path.join(stage, "apps/web")

if (!existsSync(path.join(standalone, "apps/web/server.js"))) {
  fail(
    `No standalone build at ${standalone}. Run \`pnpm --filter web build\` first.`
  )
}

rmSync(stage, { recursive: true, force: true })
// pnpm's layout is links into node_modules/.pnpm; keep them as links.
cpSync(standalone, stage, { recursive: true, verbatimSymlinks: true })
cpSync(path.join(web, ".next/static"), path.join(appDir, ".next/static"), {
  recursive: true,
})
if (existsSync(path.join(web, "public"))) {
  cpSync(path.join(web, "public"), path.join(appDir, "public"), {
    recursive: true,
  })
}

const sqlite = readdirSync(path.join(stage, "node_modules/.pnpm")).find(
  (name) => name.startsWith("better-sqlite3@")
)
for (const required of [
  "apps/web/server.js",
  "apps/web/lib/db/migrations/meta/_journal.json",
  `node_modules/.pnpm/${sqlite}/node_modules/better-sqlite3/prebuilds/linux-x64.node`,
]) {
  if (!existsSync(path.join(stage, required))) {
    fail(`The staged server is missing ${required}.`)
  }
}
for (const leaked of [".env", ".env.local", ".env.production"]) {
  if (existsSync(path.join(appDir, leaked))) {
    fail(`The staged server holds ${leaked}; keys belong in jarvis.env.`)
  }
}

console.log(`Staged Jarvis's server in ${path.relative(process.cwd(), stage)}`)

function fail(message) {
  console.error(message)
  process.exit(1)
}
