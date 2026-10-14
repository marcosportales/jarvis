import { tool } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { createBrowse, type Browse } from "../browse/browse"
import { fakeBrowserPort, watch } from "../browse/fixtures"
import { openDatabase } from "../db"
import { createMemoryStore } from "../memory/store"
import { GMAIL_TOOLS, fakeComposio, fakeConnector } from "../plugins/fixtures"
import { createPlugins, type Plugins } from "../plugins/plugins"
import { fakeSearch, NEWS } from "../search/fixtures"
import {
  createSessionStore,
  UnknownSessionError,
  type SessionStore,
} from "../sessions/store"
import { fakeFetch } from "../weather/fixtures"
import { createWeather } from "../weather/weather"
import type { WidgetLayout } from "../widgets/changes"
import { JARVIS_SYSTEM_PROMPT } from "./system-prompt"
import {
  createTurns,
  FALLBACK_REPLY,
  MAX_REPLY_STEPS,
  mergeTools,
} from "./turn"

type CallOptions = MockLanguageModelV4["doGenerateCalls"][number]
type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>

const NOW = new Date("2026-10-14T12:00:00Z")

const LAYOUT: WidgetLayout = [
  {
    id: "weather",
    name: "Tiempo",
    shown: false,
    expanded: false,
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

type Step =
  | GenerateResult
  /** Run when the model is called, to change the world mid-Turn. */
  | ((world: { sessions: SessionStore }) => Promise<GenerateResult>)

/**
 * A Turn module over real Sessions, Memories, Plugins and Weather, with the
 * model scripted step by step; the last step repeats. Composio is not
 * configured unless a fake one is given, and `plugins` replaces the Plugins
 * module outright.
 */
function setup(
  steps: Step[],
  options: {
    composio?: ReturnType<typeof fakeComposio>
    connector?: ReturnType<typeof fakeConnector>
    plugins?: Pick<Plugins, "toolsForTurn">
    search?: ReturnType<typeof fakeSearch>
    browser?: ReturnType<typeof fakeBrowserPort>
    browse?: Browse
  } = {}
) {
  const db = openDatabase(":memory:")
  const now = () => NOW
  const sessions = createSessionStore(db, { now })
  const memories = createMemoryStore(db, { now })
  const browser = options.browser ?? fakeBrowserPort()
  const browse = options.browse ?? createBrowse({ db, port: browser.port, now })
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
    plugins:
      options.plugins ??
      createPlugins({
        composio: options.composio?.composio ?? null,
        connector: (options.connector ?? fakeConnector()).connector,
      }),
    weather: createWeather({ fetch: fakeFetch().fetch, env: {} }),
    search: (options.search ?? fakeSearch()).search,
    browse,
    now,
  })
  /** What the model was sent in its first step. */
  const firstCall = (): CallOptions => {
    const sent = model.doGenerateCalls[0]
    if (!sent) throw new Error("the model was never called")
    return sent
  }
  return { turns, sessions, memories, model, firstCall, browse, browser }
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

/** Everything the model was sent in step `index`, tool results included. */
function sentInStep(model: MockLanguageModelV4, index: number) {
  return JSON.stringify(model.doGenerateCalls[index]?.prompt)
}

/** The names of the tools the model was offered. */
function offeredTools({ tools }: CallOptions) {
  return (tools ?? []).map((tool) => tool.name)
}

/** A tool that takes any input and records nothing beyond `onCall`. */
function namedTool(description: string, onCall: () => void = () => {}) {
  return tool({
    description,
    inputSchema: z.object({}).passthrough(),
    execute: async () => {
      onCall()
      return description
    },
  })
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

  describe("with Search", () => {
    it("searches the web and shows the model plain lines", async () => {
      const search = fakeSearch()
      const { turns, model } = setup(
        [
          call("search_web", { query: "horario del Prado" }),
          answer("Abre de diez a ocho."),
        ],
        { search }
      )

      const reply = await turns.take({
        text: "¿A qué hora abre el Prado?",
        widgets: LAYOUT,
      })

      expect(search.calls).toEqual([
        {
          slug: "COMPOSIO_SEARCH_WEB",
          args: { query: "horario del Prado" },
        },
      ])
      expect(reply.text).toBe("Abre de diez a ocho.")
      const seen = sentInStep(model, 1)
      expect(seen).toContain("1. Horarios y precios - Museo Nacional del Prado")
      // Lines for the model, never the provider's raw JSON.
      expect(seen).not.toContain("citations")
    })

    it("reads a page and gives the model its text", async () => {
      const search = fakeSearch()
      const { turns, model } = setup(
        [
          call("read_page", {
            url: "https://museodelprado.es/visita/horarios-y-tarifas",
          }),
          answer("Cierra a las ocho."),
        ],
        { search }
      )

      const reply = await turns.take({
        text: "¿Qué dice la web del Prado sobre los horarios?",
        widgets: LAYOUT,
      })

      expect(search.calls).toEqual([
        {
          slug: "COMPOSIO_SEARCH_FETCH_URL_CONTENT",
          args: {
            urls: ["https://museodelprado.es/visita/horarios-y-tarifas"],
            max_characters: expect.any(Number),
          },
        },
      ])
      expect(sentInStep(model, 1)).toContain("de 10:00 a 20:00 h")
      // A single page is an answer's source, not something to put on screen.
      expect(reply).not.toHaveProperty("search")
    })

    it("still replies when Search fails, telling the model it couldn't search", async () => {
      const { turns, model } = setup(
        [
          call("search_web", { query: "noticias de hoy" }),
          answer("No he podido comprobarlo."),
        ],
        {
          search: fakeSearch({
            COMPOSIO_SEARCH_WEB: { error: new Error("429 Too Many Requests") },
          }),
        }
      )

      const reply = await turns.take({
        text: "¿Qué ha pasado hoy?",
        widgets: LAYOUT,
      })

      expect(reply.text).toBe("No he podido comprobarlo.")
      expect(reply).not.toHaveProperty("search")
      expect(sentInStep(model, 1)).toContain("No he podido buscar ahora mismo")
    })

    it("tells the model when a Search found nothing, and returns the empty outcome", async () => {
      const { turns, model } = setup(
        [call("search_news", { query: "xyzzy" }), answer("No encontré nada.")],
        {
          search: fakeSearch({
            COMPOSIO_SEARCH_NEWS: { data: { news_results: [] } },
          }),
        }
      )

      const reply = await turns.take({
        text: "Noticias de xyzzy",
        widgets: LAYOUT,
      })

      expect(reply.search).toEqual({
        kind: "news",
        heading: "Noticias: xyzzy",
        results: [],
      })
      expect(sentInStep(model, 1)).toContain("La búsqueda no encontró nada")
    })

    it("returns the last Search that found something", async () => {
      const { turns } = setup(
        [
          call("search_news", { query: "Real Madrid" }),
          call("search_events", { query: "partidos del Real Madrid" }),
          answer("Hablan del Villarreal."),
        ],
        {
          search: fakeSearch({
            COMPOSIO_SEARCH_EVENT: {
              data: { results: { events_results: [] } },
            },
          }),
        }
      )

      const reply = await turns.take({ text: "¿Y el Madrid?", widgets: LAYOUT })

      expect(reply.search).toMatchObject({ kind: "news" })
    })

    it("keeps a list on screen when the model then reads one of its pages", async () => {
      const { turns } = setup([
        call("search_news", { query: "Real Madrid" }),
        call("read_page", { url: "https://www.marca.com/futbol/real-madrid" }),
        answer("Según Marca, Mourinho no quiso hablar."),
      ])

      const reply = await turns.take({
        text: "¿Qué pasa con el Madrid?",
        widgets: LAYOUT,
      })

      expect(reply.search).toMatchObject({ kind: "news" })
      expect(reply.widgetChanges).toEqual([{ type: "show", id: "results" }])
    })

    it("shows the Results Widget when a Search found several results", async () => {
      const { turns } = setup([
        call("search_news", { query: "Real Madrid" }),
        answer("Hablan del Villarreal; te dejo el resto en pantalla."),
      ])

      const reply = await turns.take({
        text: "¿Qué pasa con el Real Madrid?",
        widgets: LAYOUT,
      })

      expect(reply.widgetChanges).toEqual([{ type: "show", id: "results" }])
    })

    it("leaves the Results Widget alone for a web Search, whose results back up a single answer", async () => {
      const { turns } = setup([
        call("search_web", { query: "horario del Prado" }),
        answer("Cierra a las ocho."),
      ])

      const reply = await turns.take({
        text: "¿A qué hora cierra el Prado?",
        widgets: LAYOUT,
      })

      // Nor replaces what it shows, e.g. flights the Owner is still looking at.
      expect(reply).not.toHaveProperty("search")
      expect(reply.widgetChanges).toEqual([])
    })

    it("puts a web Search on screen when the model Shows the Results Widget", async () => {
      const { turns } = setup([
        call("search_web", { query: "horario del Prado" }),
        call("show_widget", { id: "results" }),
        answer("Te dejo las fuentes en pantalla."),
      ])

      const reply = await turns.take({
        text: "Busca el horario del Prado y enséñame los resultados",
        widgets: LAYOUT,
      })

      expect(reply.search).toMatchObject({
        kind: "web",
        heading: "Búsqueda: horario del Prado",
        results: expect.arrayContaining([
          expect.objectContaining({
            url: "https://museodelprado.es/visita/horarios-y-tarifas",
          }),
        ]),
      })
      expect(reply.widgetChanges).toEqual([{ type: "show", id: "results" }])
    })

    it.each([
      ["one result", [NEWS.news_results[0]]],
      ["no results", []],
    ])(
      "leaves the Results Widget alone when a Search found %s",
      async (_, newsResults) => {
        const { turns } = setup(
          [
            call("search_news", { query: "Real Madrid" }),
            answer("Solo hay una noticia."),
          ],
          {
            search: fakeSearch({
              COMPOSIO_SEARCH_NEWS: { data: { news_results: newsResults } },
            }),
          }
        )

        const reply = await turns.take({
          text: "¿Qué pasa con el Real Madrid?",
          widgets: LAYOUT,
        })

        expect(reply.search).toBeDefined()
        expect(reply.widgetChanges).toEqual([])
      }
    )

    it("keeps the Results Widget hidden when the model hid it in the same Turn", async () => {
      const { turns } = setup([
        call("search_news", { query: "Real Madrid" }),
        call("hide_widget", { id: "results" }),
        answer("Abre a las diez."),
      ])

      const reply = await turns.take({
        text: "¿Abre el Prado? Y quita los resultados.",
        widgets: LAYOUT,
      })

      expect(reply.widgetChanges).toEqual([{ type: "hide", id: "results" }])
    })

    it("doesn't show the Results Widget twice when the model already showed it", async () => {
      const { turns } = setup([
        call("search_news", { query: "Real Madrid" }),
        call("move_widget", { id: "results", spot: "right-middle" }),
        answer("Abre a las diez."),
      ])

      const reply = await turns.take({
        text: "¿Abre el Prado?",
        widgets: LAYOUT,
      })

      expect(reply.widgetChanges).toEqual([
        { type: "move", id: "results", spot: "right-middle" },
      ])
    })

    it("tells the model the Results on screen, numbered as shown", async () => {
      const { turns, firstCall } = setup([answer("Ryanair, 104 euros.")])

      await turns.take({
        text: "¿Y el segundo?",
        widgets: LAYOUT,
        results: {
          heading: "Vuelos MAD → FCO · vie 16 oct",
          results: [
            {
              title: "Wizz Air",
              subtitle: "MAD 22:55 → FCO 01:25 (+1)",
              facts: [{ label: "Precio", value: "60 €" }],
            },
            {
              title: "Ryanair",
              facts: [{ label: "Precio", value: "104 €" }],
              source: "Google Flights",
            },
          ],
        },
      })

      const { system } = prompt(firstCall())
      expect(system).toContain("Vuelos MAD → FCO · vie 16 oct")
      expect(system).toContain(
        "1. Wizz Air — MAD 22:55 → FCO 01:25 (+1). Precio: 60 €."
      )
      expect(system).toContain(
        "2. Ryanair. Precio: 104 €. Fuente: Google Flights."
      )
    })

    it("tells the model nothing about Results when none are on screen", async () => {
      const { turns, firstCall } = setup([answer("Hola.")])

      await turns.take({ text: "Hola", widgets: LAYOUT })

      expect(prompt(firstCall()).system).not.toMatch(/en pantalla ahora mismo/)
    })

    it("searches flights with Spanish, Spain and euro defaults, and shows them", async () => {
      const search = fakeSearch()
      const { turns } = setup(
        [
          call("search_flights", {
            from: "mad",
            to: "FCO",
            outboundDate: "2026-10-16",
          }),
          answer(
            "El más barato es Wizz Air, 60 euros; te dejo el resto en pantalla."
          ),
        ],
        { search }
      )

      const reply = await turns.take({
        text: "Vuelos de Madrid a Roma el viernes",
        widgets: LAYOUT,
      })

      expect(search.calls).toEqual([
        {
          slug: "COMPOSIO_SEARCH_FLIGHTS",
          args: {
            departure_id: "MAD",
            arrival_id: "FCO",
            outbound_date: "2026-10-16",
            adults: 1,
            children: 0,
            infants: 0,
            currency: "EUR",
            hl: "es",
            gl: "es",
          },
        },
      ])
      expect(reply.search).toMatchObject({
        kind: "flights",
        heading: "Vuelos MAD → FCO · vie 16 oct",
        results: expect.arrayContaining([
          expect.objectContaining({ title: "Wizz Air" }),
        ]),
      })
      expect(reply.widgetChanges).toEqual([{ type: "show", id: "results" }])
    })

    it("searches a round trip for several passengers in the cabin and currency named", async () => {
      const search = fakeSearch()
      const { turns } = setup(
        [
          call("search_flights", {
            from: "MAD",
            to: "LIS",
            outboundDate: "2026-11-03",
            returnDate: "2026-11-07",
            adults: 2,
            children: 1,
            cabinClass: "business",
            currency: "USD",
          }),
          answer("Desde 172 dólares."),
        ],
        { search }
      )

      const reply = await turns.take({
        text: "Ida y vuelta a Lisboa del 3 al 7 de noviembre, en business y en dólares",
        widgets: LAYOUT,
      })

      expect(search.calls[0]?.args).toEqual({
        departure_id: "MAD",
        arrival_id: "LIS",
        outbound_date: "2026-11-03",
        return_date: "2026-11-07",
        adults: 2,
        children: 1,
        infants: 0,
        travel_class: 3,
        currency: "USD",
        hl: "es",
        gl: "es",
      })
      expect(reply.search?.heading).toBe(
        "Vuelos MAD ⇄ LIS · mar 3 nov – sáb 7 nov"
      )
    })

    it.each([
      [
        "search_news",
        { query: "Real Madrid" },
        "COMPOSIO_SEARCH_NEWS",
        { query: "Real Madrid", hl: "es", gl: "es" },
        { kind: "news", heading: "Noticias: Real Madrid" },
      ],
      [
        "search_hotels",
        { place: "Lisboa", checkIn: "2026-11-03", checkOut: "2026-11-07" },
        "COMPOSIO_SEARCH_HOTELS",
        {
          q: "Lisboa",
          check_in_date: "2026-11-03",
          check_out_date: "2026-11-07",
          adults: 2,
          children: 0,
          currency: "EUR",
          hl: "es",
          gl: "es",
        },
        { kind: "hotels", heading: "Hoteles en Lisboa · 3–7 nov" },
      ],
      [
        "search_places",
        { query: "restaurantes japoneses", near: "Sol, Madrid" },
        "COMPOSIO_SEARCH_GOOGLE_MAPS",
        { q: "restaurantes japoneses cerca de Sol, Madrid" },
        {
          kind: "places",
          heading: "Lugares: restaurantes japoneses · cerca de Sol, Madrid",
        },
      ],
      [
        "search_events",
        { query: "conciertos", place: "Madrid" },
        "COMPOSIO_SEARCH_EVENT",
        { query: "conciertos", location: "Madrid", hl: "es", gl: "es" },
        { kind: "events", heading: "Eventos: conciertos · Madrid" },
      ],
    ])(
      "runs %s and returns its outcome with the Results Widget shown",
      async (toolName, input, slug, args, outcome) => {
        const search = fakeSearch()
        const { turns } = setup(
          [call(toolName, input), answer("Mira la pantalla.")],
          {
            search,
          }
        )

        const reply = await turns.take({ text: "Busca", widgets: LAYOUT })

        expect(search.calls).toEqual([{ slug, args }])
        expect(reply.search).toMatchObject(outcome)
        expect(reply.search?.results.length).toBeGreaterThan(1)
        expect(reply.widgetChanges).toEqual([{ type: "show", id: "results" }])
      }
    )

    it("searches hotels for the guests, currency and country named", async () => {
      const search = fakeSearch()
      const { turns } = setup(
        [
          call("search_hotels", {
            place: "Nueva York",
            checkIn: "2026-12-01",
            checkOut: "2026-12-05",
            adults: 1,
            children: 2,
            currency: "usd",
            country: "US",
          }),
          answer("Listo."),
        ],
        { search }
      )

      await turns.take({ text: "Hoteles en Nueva York", widgets: LAYOUT })

      expect(search.calls[0]?.args).toEqual({
        q: "Nueva York",
        check_in_date: "2026-12-01",
        check_out_date: "2026-12-05",
        adults: 1,
        children: 2,
        currency: "USD",
        hl: "es",
        gl: "us",
      })
    })

    it("returns no Search Outcome when the Turn didn't search", async () => {
      const { turns } = setup([answer("Hola.")])

      const reply = await turns.take({ text: "Hola", widgets: LAYOUT })

      expect(reply).not.toHaveProperty("search")
    })

    describe("and a Plugin tool named like a Search tool", () => {
      afterEach(() => {
        vi.restoreAllMocks()
      })

      it("runs Jarvis's own Search tool", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const pluginCalls: string[] = []
        const search = fakeSearch()
        const { turns } = setup(
          [call("search_web", { query: "Prado" }), answer("Listo.")],
          {
            search,
            plugins: {
              toolsForTurn: async () => ({
                tools: {
                  search_web: namedTool("Plugin search_web", () =>
                    pluginCalls.push("search_web")
                  ),
                },
                notices: [],
                close: async () => {},
              }),
            },
          }
        )

        await turns.take({ text: "Busca el Prado", widgets: LAYOUT })

        expect(pluginCalls).toEqual([])
        expect(search.calls).toHaveLength(1)
      })
    })
  })

  describe("with Browse", () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    const PRADO = {
      task: "Mira en museodelprado.es el horario de hoy",
      startUrl: "https://www.museodelprado.es",
    }

    it("starts a Browse Task once the model calls start_browse, and replies at once", async () => {
      const { turns, browse, browser, model } = setup([
        call("start_browse", PRADO),
        answer("Me pongo con ello; puedes verlo a la izquierda."),
      ])

      const reply = await turns.take({ text: "Sí, míralo", widgets: LAYOUT })

      expect(reply.text).toBe("Me pongo con ello; puedes verlo a la izquierda.")
      expect(browser.calls.start).toHaveLength(1)
      expect(await browse.current()).toMatchObject({
        task: PRADO.task,
        status: "running",
      })
      expect(sentInStep(model, 1)).toMatch(/Navegación iniciada/)
    })

    it("shows the Browser Widget when a Browse Task starts", async () => {
      const { turns } = setup([
        call("start_browse", PRADO),
        answer("Me pongo con ello."),
      ])

      const reply = await turns.take({ text: "Sí, míralo", widgets: LAYOUT })

      expect(reply.widgetChanges).toEqual([{ type: "show", id: "browser" }])
    })

    it("changes no Widget when the Browse Task can't start", async () => {
      const browser = fakeBrowserPort()
      browser.failures.start = true
      const { turns } = setup(
        [call("start_browse", PRADO), answer("No he podido mirarlo.")],
        { browser }
      )

      const reply = await turns.take({ text: "Sí", widgets: LAYOUT })

      expect(reply.widgetChanges).toEqual([])
    })

    it("doesn't show the Browser Widget twice when the model already showed it", async () => {
      const { turns } = setup([
        call("start_browse", PRADO),
        call("show_widget", { id: "browser" }),
        answer("Me pongo con ello."),
      ])

      const reply = await turns.take({ text: "Sí, míralo", widgets: LAYOUT })

      expect(reply.widgetChanges).toEqual([{ type: "show", id: "browser" }])
    })

    it("tells the model when starting stopped the Browse Task before it", async () => {
      const { turns, browse, model } = setup([
        call("start_browse", {
          task: "Mira el precio de una maleta en Ryanair",
        }),
        answer("Paro la anterior y me pongo con esta."),
      ])
      await browse.start(PRADO)

      await turns.take({ text: "Mejor mira lo de la maleta", widgets: LAYOUT })

      expect(sentInStep(model, 1)).toContain(PRADO.task)
      expect(sentInStep(model, 1)).toMatch(/paré/i)
    })

    it("still replies when the Browse Task can't start, telling the model", async () => {
      const browser = fakeBrowserPort()
      browser.failures.start = true
      const { turns, model } = setup(
        [call("start_browse", PRADO), answer("No he podido mirarlo.")],
        { browser }
      )

      const reply = await turns.take({ text: "Sí", widgets: LAYOUT })

      expect(reply.text).toBe("No he podido mirarlo.")
      expect(sentInStep(model, 1)).toMatch(/No he podido empezar/)
    })

    it("tells the model when a failed start had already stopped the Browse Task before it", async () => {
      const { turns, browse, browser, model } = setup([
        call("start_browse", {
          task: "Mira el precio de una maleta en Ryanair",
        }),
        answer("He parado la anterior, pero no he podido empezar esta."),
      ])
      await browse.start(PRADO)
      browser.failures.start = true

      const reply = await turns.take({
        text: "Mejor mira lo de la maleta",
        widgets: LAYOUT,
      })

      expect(sentInStep(model, 1)).toMatch(/Paré la navegación anterior/)
      expect(sentInStep(model, 1)).toMatch(/No he podido empezar/)
      expect(reply.widgetChanges).toEqual([])
    })

    it("stops the Browse Task when the model calls stop_browse", async () => {
      const { turns, browse, browser, model } = setup([
        call("stop_browse", {}),
        answer("Hecho, la he parado."),
      ])
      await browse.start(PRADO)

      await turns.take({ text: "Para", widgets: LAYOUT })

      expect(browser.calls.stop).toEqual(["task-1"])
      expect(await browse.current()).toMatchObject({ status: "stopped" })
      expect(sentInStep(model, 1)).toContain(PRADO.task)
    })

    it("tells the model when there is nothing to stop", async () => {
      const { turns, model } = setup([
        call("stop_browse", {}),
        answer("No hay nada que parar."),
      ])

      await turns.take({ text: "Para", widgets: LAYOUT })

      expect(sentInStep(model, 1)).toMatch(/no había ninguna navegación/i)
    })

    it("tells the model what a running Browse Task is doing", async () => {
      const browser = fakeBrowserPort([
        watch({
          currentGoal: "I will open the visit page.",
          currentUrl: "https://www.museodelprado.es/visita",
        }),
      ])
      const db = openDatabase(":memory:")
      const clock = { now: new Date(NOW.getTime() - 2 * 60_000) }
      const browse = createBrowse({
        db,
        port: browser.port,
        now: () => clock.now,
      })
      await browse.start(PRADO)
      clock.now = NOW
      const { turns, firstCall } = setup(
        [answer("Va por la página de visita.")],
        {
          browse,
        }
      )

      await turns.take({ text: "¿Cómo va?", widgets: LAYOUT })

      const { system } = prompt(firstCall())
      expect(system).toContain(PRADO.task)
      expect(system).toContain("I will open the visit page.")
      expect(system).toContain("museodelprado.es")
      expect(system).toMatch(/hace 2 minutos/)
    })

    it("tells the model the outcome of a Browse Task that ended", async () => {
      const browser = fakeBrowserPort([
        watch({
          status: "finished",
          output: "Abre hoy de 10:00 a 20:00.",
          success: true,
        }),
      ])
      const db = openDatabase(":memory:")
      const clock = { now: new Date(NOW.getTime() - 60_000) }
      const browse = createBrowse({
        db,
        port: browser.port,
        now: () => clock.now,
      })
      await browse.start(PRADO)
      clock.now = NOW
      await browse.current()
      const { turns, firstCall } = setup([answer("Abre de diez a ocho.")], {
        browse,
      })

      await turns.take({ text: "¿Qué has encontrado?", widgets: LAYOUT })

      const { system } = prompt(firstCall())
      expect(system).toContain(PRADO.task)
      expect(system).toContain("Abre hoy de 10:00 a 20:00.")
      expect(system).toMatch(/Estado: Terminada/)
    })

    it("tells the model nothing about Browse when there is no Browse Task", async () => {
      const { turns, firstCall } = setup([answer("Hola.")])

      await turns.take({ text: "Hola", widgets: LAYOUT })

      const { system } = prompt(firstCall())
      expect(system).not.toMatch(/Navegación en curso/)
      expect(system).not.toMatch(/Última navegación/)
    })

    it("still answers, with no Browse notice, when the Browse module fails", async () => {
      const broken: Browse = {
        start: () => Promise.reject(new Error("Browse exploded")),
        stop: () => Promise.reject(new Error("Browse exploded")),
        current: () => Promise.reject(new Error("Browse exploded")),
      }
      const errors = vi.spyOn(console, "error").mockImplementation(() => {})
      const { turns, firstCall } = setup(
        [call("stop_browse", {}), call("start_browse", PRADO), answer("Hola.")],
        { browse: broken }
      )
      const baseline = setup([answer("Hola.")])

      const reply = await turns.take({ text: "Hola", widgets: LAYOUT })
      await baseline.turns.take({ text: "Hola", widgets: LAYOUT })

      expect(reply.text).toBe("Hola.")
      expect(reply.widgetChanges).toEqual([])
      expect(prompt(firstCall()).system).toBe(
        prompt(baseline.firstCall()).system
      )
      expect(errors).toHaveBeenCalled()
    })
  })

  describe("with Plugins", () => {
    const connectedGmail = () =>
      fakeComposio({ accounts: [{ toolkit: "gmail", status: "ACTIVE" }] })

    it("hands a Connected Plugin's tools to the model and closes its Connector after the Reply", async () => {
      const connector = fakeConnector()
      const { turns, firstCall } = setup(
        [
          call("GMAIL_FETCH_EMAILS", { query: "Ana" }),
          answer("Ana te saluda."),
        ],
        { composio: connectedGmail(), connector }
      )

      const reply = await turns.take({
        text: "¿Correo nuevo?",
        widgets: LAYOUT,
      })

      expect(offeredTools(firstCall())).toEqual(
        expect.arrayContaining(GMAIL_TOOLS)
      )
      expect(connector.toolCalls).toEqual([
        { name: "GMAIL_FETCH_EMAILS", input: { query: "Ana" } },
      ])
      expect(reply.text).toBe("Ana te saluda.")
      expect(connector.closed()).toBe(1)
    })

    it("saves nothing when the model fails, and still closes the Plugin Connector", async () => {
      const connector = fakeConnector()
      const { turns, sessions, memories } = setup(
        [
          call("remember", sister),
          () => Promise.reject(new Error("model unavailable")),
        ],
        { composio: connectedGmail(), connector }
      )

      await expect(
        turns.take({ text: "Mi hermana es Lucía", widgets: LAYOUT })
      ).rejects.toThrow("model unavailable")

      expect((await sessions.list()).sessions).toEqual([])
      expect(await memories.all()).toMatchObject([{ sourceSessionId: null }])
      expect(connector.closed()).toBe(1)
    })

    it("puts Plugin notices last in the system prompt, after the core Memories", async () => {
      const { turns, memories, firstCall } = setup([answer("Hola.")], {
        composio: fakeComposio({
          accounts: [{ toolkit: "gmail", status: "EXPIRED" }],
        }),
      })
      await memories.remember(sister)

      await turns.take({ text: "Hola", widgets: LAYOUT })

      const { system } = prompt(firstCall())
      const lastPart = system.split("\n\n").at(-1)
      expect(lastPart).toMatch(/^No tienes acceso a Gmail/)
      expect(lastPart).toMatch(/reconectarlo en Plugins/)
      expect(system.indexOf("[hermana] Su hermana")).toBeLessThan(
        system.indexOf("No tienes acceso a Gmail")
      )
    })

    it("still answers, with no Plugin tools or notices, when loading Plugin tools fails", async () => {
      // The real Plugins module turns its own failures into notices, so a
      // stub stands in for a bug it didn't catch.
      const { turns, sessions, firstCall } = setup([answer("Hola.")], {
        plugins: {
          toolsForTurn: () => Promise.reject(new Error("Plugins exploded")),
        },
      })
      const withoutComposio = setup([answer("Hola.")])

      const reply = await turns.take({ text: "Hola", widgets: LAYOUT })
      await withoutComposio.turns.take({ text: "Hola", widgets: LAYOUT })

      expect(reply.text).toBe("Hola.")
      expect(await sessions.transcript(reply.sessionId)).toHaveLength(1)
      // Exactly what a Turn without any Plugins sends.
      const baseline = withoutComposio.firstCall()
      expect(offeredTools(firstCall())).toEqual(offeredTools(baseline))
      expect(prompt(firstCall()).system).toBe(prompt(baseline).system)
    })

    it("still answers when the Connector won't connect, telling the model why", async () => {
      const { turns, firstCall } = setup([answer("Gmail no responde.")], {
        composio: connectedGmail(),
        connector: fakeConnector({ connectError: new Error("HTTP 401") }),
      })

      const reply = await turns.take({
        text: "¿Correo nuevo?",
        widgets: LAYOUT,
      })

      expect(reply.text).toBe("Gmail no responde.")
      expect(offeredTools(firstCall())).not.toContain("GMAIL_FETCH_EMAILS")
      expect(prompt(firstCall()).system).toMatch(
        /Gmail no responde ahora mismo/
      )
    })

    describe("whose tool is named like one of Jarvis's own", () => {
      afterEach(() => {
        vi.restoreAllMocks()
      })

      it("runs Jarvis's own tool, logs the clash and still offers the Plugin's other tools", async () => {
        const errors = vi.spyOn(console, "error").mockImplementation(() => {})
        const pluginCalls: string[] = []
        const pluginTool = (name: string) =>
          namedTool(`Plugin ${name}`, () => pluginCalls.push(name))
        // The real Plugins module only serves allowlisted Composio names, so
        // a stub stands in for a Plugin that serves a clashing one.
        const { turns, memories, firstCall } = setup(
          [call("remember", sister), answer("Lo tendré en cuenta.")],
          {
            plugins: {
              toolsForTurn: async () => ({
                tools: {
                  remember: pluginTool("remember"),
                  GMAIL_FETCH_EMAILS: pluginTool("GMAIL_FETCH_EMAILS"),
                },
                notices: [],
                close: async () => {},
              }),
            },
          }
        )

        const reply = await turns.take({
          text: "Mi hermana se llama Lucía",
          widgets: LAYOUT,
        })

        expect(pluginCalls).toEqual([])
        expect(reply.memoryEvents).toEqual([
          { kind: "remembered", title: "Su hermana" },
        ])
        expect(await memories.all()).toMatchObject([sister])
        const offered = firstCall().tools ?? []
        expect(offered.map((tool) => tool.name)).toContain("GMAIL_FETCH_EMAILS")
        const remember = offered.find((tool) => tool.name === "remember")
        expect(
          remember && "description" in remember && remember.description
        ).not.toBe("Plugin remember")
        expect(errors).toHaveBeenCalledWith(
          expect.stringContaining('"remember"')
        )
      })
    })
  })
})

// Today's built-in tool factories can't be made to clash from a Turn, so
// this one rule is checked on the merge itself.
describe("Merging a Turn's tools", () => {
  it("throws when two of Jarvis's own tools share a name", () => {
    expect(() =>
      mergeTools({
        builtIn: [
          { remember: namedTool("Memory") },
          { remember: namedTool("Widgets") },
        ],
        plugin: {},
      })
    ).toThrow(/remember/)
  })
})
