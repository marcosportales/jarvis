/**
 * Where the Jarvis App's own server listens and what it runs with: keys from
 * `jarvis.env`, the database and the log in the config directory
 * (`~/.config/Jarvis`), and always `127.0.0.1`, never the Owner's network.
 */

import path from "node:path"

/** Only this computer reaches Jarvis. */
export const HOST = "127.0.0.1"

/** Clear of `pnpm dev` on 3000, so both can run at once. */
export const DEFAULT_PORT = 3737

export type ServerConfig = {
  /** Jarvis's own origin, e.g. `http://127.0.0.1:3737`. */
  origin: string
  envFilePath: string
  logFile: string
  /** The server process's whole environment. */
  serverEnv: Record<string, string>
}

/** The path of the keys file in `configDir`, read before resolving. */
export function envFilePath(configDir: string) {
  return path.join(configDir, "jarvis.env")
}

export function resolveServerConfig({
  configDir,
  env,
  envFile,
}: {
  configDir: string
  /** The Jarvis App's own environment. */
  env: Readonly<Record<string, string | undefined>>
  /** The text of `jarvis.env`, or undefined if there is none. */
  envFile: string | undefined
}): ServerConfig {
  const keys = envFile === undefined ? {} : parseEnvFile(envFile)
  const port = parsePort(env.JARVIS_PORT ?? keys.JARVIS_PORT)

  return {
    origin: `http://${HOST}:${port}`,
    envFilePath: envFilePath(configDir),
    logFile: path.join(configDir, "jarvis.log"),
    serverEnv: {
      ...definedOnly(env),
      ...keys,
      NODE_ENV: "production",
      HOSTNAME: HOST,
      PORT: String(port),
      JARVIS_DB_PATH: path.join(configDir, "jarvis.db"),
    },
  }
}

function parsePort(value: string | undefined) {
  if (value === undefined) return DEFAULT_PORT
  const port = Number(value)
  if (!/^\d+$/.test(value.trim()) || port < 1 || port > 65_535) {
    throw new Error(
      `JARVIS_PORT debe ser un puerto entre 1 y 65535, no «${value}».`
    )
  }
  return port
}

function definedOnly(env: Readonly<Record<string, string | undefined>>) {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  )
}

const ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/

/**
 * Reads a dotenv-style file: `KEY=value` lines, `#` comments, blank lines,
 * single quotes taken literally and double quotes with `\n` escapes.
 */
export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const match = ASSIGNMENT.exec(line.trim())
    if (!match) continue
    const [, key, raw] = match as unknown as [string, string, string]
    values[key] = parseValue(raw.trim())
  }
  return values
}

function parseValue(raw: string) {
  const double = /^"(.*)"/.exec(raw)
  if (double) {
    return double[1]!.replace(/\\([nrt"\\])/g, (_, char: string) =>
      char === "n" ? "\n" : char === "r" ? "\r" : char === "t" ? "\t" : char
    )
  }
  const single = /^'(.*)'/.exec(raw)
  if (single) return single[1]!
  // Unquoted: a ` #` starts a comment.
  return raw.replace(/\s+#.*$/, "").trim()
}
