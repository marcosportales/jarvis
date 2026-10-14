import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"

import { openDatabase } from "../db"
import { createMemoryStore } from "../memory/store"
import type { Connector } from "../plugins/connector"
import { createPlugins } from "../plugins/plugins"
import {
  createSessionStore,
  UnknownSessionError,
  type SessionStore,
} from "../sessions/store"
import { fakeFetch } from "../weather/fixtures"
import { createWeather } from "../weather/weather"
import type { WidgetLayout } from "../widgets/changes"
import { JARVIS_SYSTEM_PROMPT } from "./system-prompt"
import { createTurns, FALLBACK_REPLY, MAX_REPLY_STEPS } from "./turn"

type CallOptions = MockLanguageModelV4["doGenerateCalls"][number]
type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>

const NOW = new Date("2026-10-14T12:00:00Z")

const LAYOUT: WidgetLayout = [
  {
    id: "weather",
    name: "Tiempo",
    shown: false,
    spot: "right-top",
    settings: {},
  },
]

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
}

/** One model step that answers with `text`. */
function answer(text: string): GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: undefined },
    usage,
    warnings: [],
  }
}

let nextCallId = 1

/** One model step that calls a tool and waits for its result. */
function call(toolName: string, input: unknown): GenerateResult {
  return {
    content: [
      {
        type: "tool-call",
        toolCallId: `call-${nextCallId++}`,
        toolName,
        input: JSON.stringify(input),
      },
    ],
    finishReason: { unified: "tool-calls", raw: undefined },
    usage,
    warnings: [],
  }
}

/** Composio is not configured, so no Connector is ever opened. */
const unusedConnector: Connector = {
  connect: () => Promise.reject(new Error("no Connector in these tests")),
}

type Step =
  | GenerateResult
  /** Run when the model is called, to change the world mid-Turn. */
  | ((world: { sessions: SessionStore }) => Promise<GenerateResult>)

/**
 * A Turn module over real Sessions, Memories, Plugins and Weather, with the
 * model scripted step by step; the last step repeats.
 */
function setup(steps: Step[]) {
  const db = openDatabase(":memory:")
  const now = () => NOW
  const sessions = createSessionStore(db, { now })
  const memories = createMemoryStore(db, { now })
  let step = 0
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      const next = steps[Math.min(step++, steps.length - 1)]
      if (!next) throw new Error("the model has no scripted step")
      return typeof next === "function" ? next({ sessions }) : next
    },
  })
  const turns = createTurns({
    model,
    sessions,
    memories,
    plugins: createPlugins({ composio: null, connector: unusedConnector }),
    weather: createWeather({ fetch: fakeFetch().fetch, env: {} }),
    now,
  })
  /** What the model was sent in its first step. */
  const firstCall = (): CallOptions => {
    const sent = model.doGenerateCalls[0]
    if (!sent) throw new Error("the model was never called")
    return sent
  }
  return { turns, sessions, memories, model, firstCall }
}

/** The system prompt and the conversation, as plain text per message. */
function prompt({ prompt }: CallOptions) {
  const [system, ...messages] = prompt
  if (system?.role !== "system") throw new Error("no system prompt")
  return {
    system: system.content,
    messages: messages.map((message) => ({
      role: message.role,
      text: Array.isArray(message.content)
        ? message.content
            .map((part) => ("text" in part ? part.text : ""))
            .join("")
        : message.content,
    })),
  }
}

const sister = {
  topicKey: "hermana",
  title: "Su hermana",
  content: "La hermana del dueño se llama Lucía.",
}

describe("Taking a Turn", () => {
  it("starts a new Session, saves the Turn and ties its Memories to it", async () => {
    const { turns, sessions, memories } = setup([
      call("remember", sister),
      answer("  Lo tendré en cuenta.  "),
    ])

    const reply = await turns.take({
      text: "Mi hermana se llama Lucía",
      widgets: LAYOUT,
    })

    expect(reply).toEqual({
      sessionId: expect.any(String),
      text: "Lo tendré en cuenta.",
      widgetChanges: [],
      memoryEvents: [{ kind: "remembered", title: "Su hermana" }],
    })
    expect(await sessions.transcript(reply.sessionId)).toEqual([
      {
        owner: "Mi hermana se llama Lucía",
        reply: "Lo tendré en cuenta.",
        memoryEvents: [{ kind: "remembered", title: "Su hermana" }],
      },
    ])
    expect(await memories.all()).toMatchObject([
      { ...sister, sourceSessionId: reply.sessionId },
    ])
  })

  it("adds the Turn to an existing Session, after its earlier Turns", async () => {
    const { turns, sessions, firstCall } = setup([answer("Se llama Lucía.")])
    const sessionId = await sessions.start({
      owner: "Hola",
      reply: "Buenos días.",
    })
    await sessions.addTurn(sessionId, {
      owner: "Tengo una hermana",
      reply: "Qué bien.",
    })

    const reply = await turns.take({
      sessionId,
      text: "¿Cómo se llama?",
      widgets: LAYOUT,
    })

    expect(reply.sessionId).toBe(sessionId)
    expect(prompt(firstCall()).messages).toEqual([
      { role: "user", text: "Hola" },
      { role: "assistant", text: "Buenos días." },
      { role: "user", text: "Tengo una hermana" },
      { role: "assistant", text: "Qué bien." },
      { role: "user", text: "¿Cómo se llama?" },
    ])
    const transcript = await sessions.transcript(sessionId)
    expect(transcript).toHaveLength(3)
    expect(transcript?.at(-1)).toEqual({
      owner: "¿Cómo se llama?",
      reply: "Se llama Lucía.",
    })
  })

  it("throws for an unknown Session without calling the model", async () => {
    const { turns, sessions, model } = setup([answer("Hola.")])

    await expect(
      turns.take({ sessionId: "missing", text: "Hola", widgets: LAYOUT })
    ).rejects.toBeInstanceOf(UnknownSessionError)

    expect(model.doGenerateCalls).toHaveLength(0)
    expect((await sessions.list()).sessions).toEqual([])
  })

  it("throws when the Session is deleted while the model answers, saving nothing", async () => {
    let sessionId = ""
    const { turns, sessions, memories } = setup([
      call("remember", sister),
      async ({ sessions }) => {
        await sessions.delete(sessionId)
        return answer("Lo tendré en cuenta.")
      },
    ])
    sessionId = await sessions.start({ owner: "Hola", reply: "Hola." })

    await expect(
      turns.take({ sessionId, text: "Mi hermana es Lucía", widgets: LAYOUT })
    ).rejects.toBeInstanceOf(UnknownSessionError)

    expect(await sessions.transcript(sessionId)).toBeNull()
    expect((await sessions.list()).sessions).toEqual([])
    // Remembered while the Session existed, then let go with it.
    expect(await memories.all()).toMatchObject([{ sourceSessionId: null }])
  })

  it("replaces an empty Reply after the step limit with the fallback, and saves that", async () => {
    const { turns, sessions, model } = setup([
      call("recall", { query: "hermana" }),
    ])

    const reply = await turns.take({ text: "¿Y mi hermana?", widgets: LAYOUT })

    expect(model.doGenerateCalls).toHaveLength(MAX_REPLY_STEPS)
    expect(reply.text).toBe(FALLBACK_REPLY)
    expect(await sessions.transcript(reply.sessionId)).toEqual([
      { owner: "¿Y mi hermana?", reply: FALLBACK_REPLY },
    ])
  })

  it("builds the system prompt in order: Jarvis, the date, the Widgets, the core Memories", async () => {
    const { turns, memories, firstCall } = setup([answer("Hola.")])
    await memories.remember(sister)

    await turns.take({ text: "Hola", widgets: LAYOUT })

    const { system } = prompt(firstCall())
    const parts = [
      JARVIS_SYSTEM_PROMPT,
      "Fecha y hora actuales:",
      "Widgets del dueño ahora mismo",
      "[hermana] Su hermana",
    ].map((part) => system.indexOf(part))
    expect(system.startsWith(JARVIS_SYSTEM_PROMPT)).toBe(true)
    expect(parts).not.toContain(-1)
    expect(parts).toEqual([...parts].sort((a, b) => a - b))
    // From the injected clock.
    expect(system).toContain("14 de octubre de 2026")
  })

  it("gives back the Widget changes and Memory events of the model's tool calls", async () => {
    const { turns, memories } = setup([
      call("show_widget", { id: "weather" }),
      call("remember", sister),
      call("forget", { topicKey: "trabajo" }),
      answer("Listo."),
    ])
    await memories.remember({
      topicKey: "trabajo",
      title: "Su trabajo",
      content: "El dueño trabaja en Acme.",
    })

    const reply = await turns.take({ text: "Varias cosas", widgets: LAYOUT })

    expect(reply.widgetChanges).toEqual([{ type: "show", id: "weather" }])
    expect(reply.memoryEvents).toEqual([
      { kind: "remembered", title: "Su hermana" },
      { kind: "forgotten", title: "Su trabajo" },
    ])
  })

  it("answers the weather from the Owner's coordinates", async () => {
    const { turns, model } = setup([
      call("get_weather", {}),
      answer("Hace sol."),
    ])

    await turns.take({
      text: "¿Qué tiempo hace?",
      widgets: LAYOUT,
      coords: { latitude: 40.4, longitude: -3.7 },
    })

    const toolResult = JSON.stringify(model.doGenerateCalls[1]?.prompt)
    expect(toolResult).toMatch(/ubicación del dueño/)
  })
})
