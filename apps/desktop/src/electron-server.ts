/**
 * Picks Jarvis's server for the Electron adapter. Packaged, the Jarvis App
 * runs its own: the web app's standalone server, in an Electron utility
 * process on Electron's own Node, with its config from `~/.config/Jarvis`.
 * Unpackaged (`pnpm dev:app`), it's the `next dev` server beside it.
 */

import { createWriteStream, readFileSync, type WriteStream } from "node:fs"
import path from "node:path"

import { app, utilityProcess } from "electron"

import { envFilePath, resolveServerConfig } from "./config.js"
import { createDevServer } from "./dev-server.js"
import { createOwnServer, type Fork } from "./own-server.js"
import type { Server } from "./ports.js"

export type JarvisServer = {
  origin: string
  server: Server
  /** Where the server's output goes; none in dev mode, it's in the terminal. */
  logFile?: string
}

const DEV_ORIGIN = "http://localhost:3000"

/** `next dev` builds the page on its first request, which can be slow. */
const DEV_READY_TIMEOUT_MS = 120_000

/** The built server answers within a second or two; this is ample. */
const OWN_READY_TIMEOUT_MS = 30_000

/**
 * Jarvis's server for this run. Throws, with a message for the Owner, when
 * the config is wrong (a bad `JARVIS_PORT`, an unreadable `jarvis.env`).
 */
export function jarvisServer(): JarvisServer {
  if (!app.isPackaged) {
    return {
      origin: DEV_ORIGIN,
      server: createDevServer({
        origin: DEV_ORIGIN,
        timeoutMs: DEV_READY_TIMEOUT_MS,
      }),
    }
  }

  const configDir = app.getPath("userData")
  const config = resolveServerConfig({
    configDir,
    env: process.env,
    envFile: readEnvFile(envFilePath(configDir)),
  })
  let log: WriteStream | undefined

  return {
    origin: config.origin,
    logFile: config.logFile,
    server: createOwnServer({
      appDir: path.join(process.resourcesPath, "server/apps/web"),
      origin: config.origin,
      env: config.serverEnv,
      timeoutMs: OWN_READY_TIMEOUT_MS,
      fork: (options) => {
        // Each run starts a fresh log, so it holds only this run's story.
        log = createWriteStream(config.logFile, { flags: "w" })
        log.write(
          `Jarvis ${app.getVersion()}, ${new Date().toISOString()}, ${config.origin}\n`
        )
        return forkUtilityProcess(options)
      },
      log: {
        write: (text) => void log?.write(text),
        end: () => endLog(log),
      },
    }),
  }
}

/** Ends the log; resolves once it's all in the file, or writing failed. */
function endLog(log: WriteStream | undefined) {
  return new Promise<void>((resolve) => {
    if (!log || log.writableFinished) return resolve()
    log.once("error", () => resolve())
    log.end(() => resolve())
  })
}

function readEnvFile(file: string) {
  try {
    return readFileSync(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw new Error(`No se puede leer ${file}: ${(error as Error).message}`, {
      cause: error,
    })
  }
}

const forkUtilityProcess: Fork = ({ modulePath, cwd, env }) => {
  const child = utilityProcess.fork(modulePath, [], {
    cwd,
    env,
    stdio: "pipe",
    serviceName: "Jarvis server",
  })
  return {
    onOutput(listener) {
      const forward = (chunk: Buffer) => listener(chunk.toString())
      child.stdout?.on("data", forward)
      child.stderr?.on("data", forward)
    },
    onExit(listener) {
      child.on("exit", (code) => listener(code))
    },
    kill() {
      child.kill()
    },
  }
}
