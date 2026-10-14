import { describe, expect, it } from "vitest"

import { parseEnvFile, resolveServerConfig } from "./config.js"

const CONFIG_DIR = "/home/owner/.config/Jarvis"

function resolve({
  env = {},
  envFile,
}: {
  env?: Record<string, string>
  envFile?: string
} = {}) {
  return resolveServerConfig({ configDir: CONFIG_DIR, env, envFile })
}

describe("The Jarvis App's own server config", () => {
  it("listens on 127.0.0.1:3737 by default", () => {
    const config = resolve()
    expect(config.origin).toBe("http://127.0.0.1:3737")
    expect(config.serverEnv.HOSTNAME).toBe("127.0.0.1")
    expect(config.serverEnv.PORT).toBe("3737")
  })

  it("takes its port from JARVIS_PORT", () => {
    const config = resolve({ env: { JARVIS_PORT: "4545" } })
    expect(config.origin).toBe("http://127.0.0.1:4545")
    expect(config.serverEnv.PORT).toBe("4545")
  })

  it("takes JARVIS_PORT from jarvis.env too, the environment winning", () => {
    expect(resolve({ envFile: "JARVIS_PORT=4000" }).origin).toBe(
      "http://127.0.0.1:4000"
    )
    expect(
      resolve({ env: { JARVIS_PORT: "4545" }, envFile: "JARVIS_PORT=4000" })
        .origin
    ).toBe("http://127.0.0.1:4545")
  })

  it("rejects a JARVIS_PORT that isn't a port", () => {
    for (const port of ["abc", "0", "70000", "37.5", ""]) {
      expect(() => resolve({ env: { JARVIS_PORT: port } })).toThrow(
        /JARVIS_PORT/
      )
    }
  })

  it("always binds to 127.0.0.1, whatever the keys say", () => {
    const config = resolve({
      env: { HOSTNAME: "my-laptop" },
      envFile: "HOSTNAME=0.0.0.0\nPORT=80",
    })
    expect(config.serverEnv.HOSTNAME).toBe("127.0.0.1")
    expect(config.serverEnv.PORT).toBe("3737")
  })

  it("keeps the database, keys and log under the config directory", () => {
    const config = resolve({ envFile: "JARVIS_DB_PATH=/tmp/dev.db" })
    expect(config.serverEnv.JARVIS_DB_PATH).toBe(`${CONFIG_DIR}/jarvis.db`)
    expect(config.envFilePath).toBe(`${CONFIG_DIR}/jarvis.env`)
    expect(config.logFile).toBe(`${CONFIG_DIR}/jarvis.log`)
  })

  it("passes the keys from jarvis.env over the environment's", () => {
    const config = resolve({
      env: { PATH: "/usr/bin", NAN_API_KEY: "from-shell" },
      envFile: "NAN_API_KEY=from-file\nCOMPOSIO_API_KEY=abc",
    })
    expect(config.serverEnv).toMatchObject({
      PATH: "/usr/bin",
      NAN_API_KEY: "from-file",
      COMPOSIO_API_KEY: "abc",
      NODE_ENV: "production",
    })
  })

  it("works without a jarvis.env", () => {
    expect(resolve({ envFile: undefined }).serverEnv.PORT).toBe("3737")
  })
})

describe("Reading jarvis.env", () => {
  it("reads KEY=value lines", () => {
    expect(parseEnvFile("A=1\nB=two words\n")).toEqual({
      A: "1",
      B: "two words",
    })
  })

  it("skips blank lines and comments", () => {
    expect(
      parseEnvFile("# Jarvis's keys\n\n   \nA=1 # the first\n  # B=2\n")
    ).toEqual({ A: "1" })
  })

  it("unquotes single- and double-quoted values", () => {
    expect(
      parseEnvFile(
        [
          `A="with # hash"`,
          `B='single $quoted'`,
          `C="line\\nbreak"`,
          `D=""`,
          `E='it''s'`,
        ].join("\n")
      )
    ).toEqual({
      A: "with # hash",
      B: "single $quoted",
      C: "line\nbreak",
      D: "",
      E: "it''s",
    })
  })

  it("trims spaces, accepts `export` and Windows line ends", () => {
    expect(parseEnvFile("export A = 1 \r\n  B=2\r\n")).toEqual({
      A: "1",
      B: "2",
    })
  })

  it("ignores lines that aren't assignments", () => {
    expect(parseEnvFile("not an assignment\n=nokey\n1A=x\nOK=yes")).toEqual({
      OK: "yes",
    })
  })
})
