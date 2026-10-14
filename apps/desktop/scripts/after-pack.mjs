// electron-builder hook: copies the staged server into the packaged app's
// resources as it is. Passing it as `extraResources` instead would run it
// through electron-builder's node_modules filters, which drop files the
// server needs (pnpm's links, whole `lib` folders).

import { cpSync, existsSync } from "node:fs"
import path from "node:path"

const stage = path.join(import.meta.dirname, "../.stage/server")

/** @param {{ appOutDir: string }} context */
export default function afterPack({ appOutDir }) {
  if (!existsSync(stage)) {
    throw new Error(
      `No staged server at ${stage}; run scripts/stage-server.mjs`
    )
  }
  cpSync(stage, path.join(appOutDir, "resources/server"), {
    recursive: true,
    verbatimSymlinks: true,
  })
}
