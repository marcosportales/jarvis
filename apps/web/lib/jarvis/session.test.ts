import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  BROWSE_POLL_MS,
  DISCARDED_UTTERANCE_HINT,
  SessionGoneError,
  type Reply,
} from "./session"
import {
  deferred,
  fakeBrowse,
  fakeListener,
  fakeTranscriber,
  flush,
  setup,
  type Deferred,
} from "./session-fakes"
import type { BrowseView } from "../browse/view"
import type { MemoryEvent } from "../memory/events"
import type { SearchOutcome } from "../search/outcome"
import type { WidgetChange } from "../widgets/changes"

describe("Jarvis Session", () => {
  it("completes a spoken Turn: Listening → Thinking → Speaking → Idle", async () => {
    const { session, listener, transcriber, brain, voice, states, transcript } =
      setup()

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(listener.calls).toEqual(["holdStart", "open", "holdEnd", "close"])
    expect(transcriber.calls).toHaveLength(1)
    expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])

    brain.answer("Buenas tardes, señor.")
    await flush()

    expect(voice.spoken).toEqual(["Buenas tardes, señor."])
    expect(session.getSnapshot().state).toBe("speaking")

    voice.finish()
    await flush()

    expect(states).toEqual([
      "idle",
      "listening",
      "thinking",
      "speaking",
      "idle",
    ])
    expect(transcript()).toEqual([
      { role: "owner", text: "Hola Jarvis" },
      { role: "jarvis", text: "Buenas tardes, señor." },
    ])
  })

  it("completes a typed Turn and speaks the Reply", async () => {
    const { session, listener, brain, voice, states, transcript } = setup()

    session.sendTypedMessage("¿Qué hora es?")
    await flush()
    brain.answer("Son las cinco, señor.")
    await flush()
    voice.finish()
    await flush()

    expect(listener.calls).toEqual([])
    expect(brain.calls).toEqual([{ text: "¿Qué hora es?" }])
    expect(voice.spoken).toEqual(["Son las cinco, señor."])
    expect(states).toEqual(["idle", "thinking", "speaking", "idle"])
    expect(transcript()).toEqual([
      { role: "owner", text: "¿Qué hora es?" },
      { role: "jarvis", text: "Son las cinco, señor." },
    ])
  })

  it("discards an Utterance shorter than half a second with a hint", async () => {
    const { session, transcriber, brain, states, transcript } = setup({
      listener: fakeListener({ durationMs: 300 }),
    })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(transcriber.calls).toEqual([])
    expect(brain.calls).toEqual([])
    expect(transcript()).toEqual([])
    expect(session.getSnapshot().hint).toBe("No te entendí")
    expect(states.at(-1)).toBe("idle")
  })

  it("discards an Utterance that transcribes to nothing with a hint", async () => {
    const { session, brain, states, transcript } = setup({
      transcriber: fakeTranscriber("   "),
    })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(brain.calls).toEqual([])
    expect(transcript()).toEqual([])
    expect(session.getSnapshot().hint).toBe("No te entendí")
    expect(states.at(-1)).toBe("idle")
  })

  it("clears the hint when the Owner starts the next Utterance", async () => {
    const { session } = setup({ listener: fakeListener({ durationMs: 100 }) })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()
    session.pressPushToTalk()

    expect(session.getSnapshot().hint).toBeNull()
  })

  it("interrupts Speaking on push-to-talk and keeps the interrupted Reply", async () => {
    const { session, brain, voice, transcript } = setup()
    session.sendTypedMessage("Cuéntame algo")
    await flush()
    brain.answer("Había una vez un mayordomo muy paciente.")
    await flush()
    expect(session.getSnapshot().state).toBe("speaking")

    session.pressPushToTalk()
    await flush()

    expect(voice.stopped()).toBe(1)
    expect(session.getSnapshot().state).toBe("listening")
    expect(transcript()).toEqual([
      { role: "owner", text: "Cuéntame algo" },
      { role: "jarvis", text: "Había una vez un mayordomo muy paciente." },
    ])
  })

  it("interrupts Speaking when the Owner types a message", async () => {
    const { session, brain, voice } = setup()
    session.sendTypedMessage("Cuéntame algo")
    await flush()
    brain.answer("Había una vez un mayordomo muy paciente.")
    await flush()

    session.sendTypedMessage("Basta")
    await flush()

    expect(voice.stopped()).toBe(1)
    expect(session.getSnapshot().state).toBe("thinking")
    expect(brain.calls.at(-1)).toEqual({
      sessionId: "session-1",
      text: "Basta",
      interrupted: { cut: 0.5 },
    })
  })

  it("ignores push-to-talk and typed messages while Thinking", async () => {
    const { session, listener, brain, voice, transcript } = setup()
    session.sendTypedMessage("Primero")
    await flush()

    session.pressPushToTalk()
    session.releasePushToTalk()
    session.sendTypedMessage("Segundo")
    await flush()

    expect(session.getSnapshot().state).toBe("thinking")
    expect(listener.calls).toEqual([])
    expect(brain.calls).toHaveLength(1)

    brain.answer("Respuesta.")
    await flush()
    voice.finish()
    await flush()

    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "owner", text: "Primero" },
      { role: "jarvis", text: "Respuesta." },
    ])
  })

  it("shows an inline error when the microphone is denied, and typing still works", async () => {
    const { session, brain, voice, transcript } = setup({
      listener: fakeListener({
        openError: new DOMException("denied", "NotAllowedError"),
      }),
    })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "error", text: expect.stringMatching(/micrófono/i) },
    ])

    session.sendTypedMessage("¿Me oyes?")
    await flush()
    brain.answer("Le leo, señor.")
    await flush()
    voice.finish()
    await flush()

    expect(brain.calls).toEqual([{ text: "¿Me oyes?" }])
    expect(transcript().at(-1)).toEqual({
      role: "jarvis",
      text: "Le leo, señor.",
    })
  })

  it("sends a hold's pieces as one message once its Turn has ended", async () => {
    const listener = fakeListener({ manual: true })
    const { session, transcriber, brain, transcript } = setup({
      listener,
      transcriber: fakeTranscriber((audio) => audio.text()),
    })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()
    listener.fire.pieceReady(listener.audio("Pon una alarma"), 1500)
    listener.fire.pieceReady(listener.audio("a las siete"), 1000)
    await flush()

    expect(brain.calls).toEqual([])

    listener.fire.endOfTurn()
    await flush()

    expect(transcriber.calls).toHaveLength(2)
    expect(brain.calls).toEqual([{ text: "Pon una alarma a las siete" }])
    expect(transcript()).toEqual([
      { role: "owner", text: "Pon una alarma a las siete" },
    ])
    expect(listener.calls.at(-1)).toBe("close")
  })

  it("shows an inline error when capturing the hold fails, and releases the mic", async () => {
    const listener = fakeListener({ manual: true })
    const { session, transcriber, brain, transcript } = setup({ listener })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()
    listener.fire.failed(new Error("MediaRecorder broke"))
    await flush()

    expect(transcriber.calls).toEqual([])
    expect(brain.calls).toEqual([])
    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "error", text: expect.stringMatching(/micrófono/i) },
    ])
    expect(listener.calls.at(-1)).toBe("close")
  })

  it("shows an inline error and returns to Idle when transcription fails", async () => {
    const { session, brain, transcript } = setup({
      transcriber: fakeTranscriber(new Error("Nan 500")),
    })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(brain.calls).toEqual([])
    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "error", text: expect.stringMatching(/transcribir/i) },
    ])
  })

  it("shows an inline error and returns to Idle when the Brain fails", async () => {
    const { session, brain, voice, transcript } = setup()

    session.sendTypedMessage("Hola")
    await flush()
    brain.fail(new Error("Nan 500"))
    await flush()

    expect(voice.spoken).toEqual([])
    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "owner", text: "Hola" },
      { role: "error", text: expect.stringMatching(/respuesta/i) },
    ])
  })

  it("keeps the Reply text and returns to Idle when speaking it fails", async () => {
    const { session, brain, voice, transcript } = setup()

    session.sendTypedMessage("Hola")
    await flush()
    brain.answer("Buenas noches, señor.")
    await flush()
    voice.fail(new DOMException("blocked", "NotAllowedError"))
    await flush()

    expect(session.getSnapshot().state).toBe("idle")
    expect(transcript()).toEqual([
      { role: "owner", text: "Hola" },
      { role: "jarvis", text: "Buenas noches, señor." },
      { role: "error", text: expect.stringMatching(/reproducir/i) },
    ])
  })

  it("adopts the Session id of the first Turn and sends it with later Turns", async () => {
    const { session, brain, voice } = setup()
    expect(session.getSnapshot().sessionId).toBeNull()

    session.sendTypedMessage("Hola")
    await flush()
    brain.answer("Buenas tardes, señor.", [], "trip")
    await flush()
    voice.finish()
    await flush()
    session.sendTypedMessage("¿Llueve en Madrid?")
    await flush()

    expect(session.getSnapshot().sessionId).toBe("trip")
    expect(brain.calls).toEqual([
      { text: "Hola" },
      { sessionId: "trip", text: "¿Llueve en Madrid?" },
    ])
  })

  it("sends only the new message, never inline errors", async () => {
    const { session, brain } = setup()

    session.sendTypedMessage("¿Llueve?")
    await flush()
    brain.fail(new Error("Nan 500"))
    await flush()
    session.sendTypedMessage("¿Llueve hoy?")
    await flush()

    expect(session.getSnapshot().sessionId).toBeNull()
    expect(brain.calls.at(-1)).toEqual({ text: "¿Llueve hoy?" })
  })

  it("starts from a saved Transcript and continues that Session", async () => {
    const { session, brain, transcript } = setup({
      saved: {
        sessionId: "trip",
        turns: [{ owner: "Voy a Lisboa", reply: "Buen viaje, señor." }],
      },
    })

    expect(session.getSnapshot().state).toBe("idle")
    expect(session.getSnapshot().sessionId).toBe("trip")
    expect(transcript()).toEqual([
      { role: "owner", text: "Voy a Lisboa" },
      { role: "jarvis", text: "Buen viaje, señor." },
    ])

    session.sendTypedMessage("¿Y mañana?")
    await flush()

    expect(brain.calls).toEqual([{ sessionId: "trip", text: "¿Y mañana?" }])
  })

  it("marks the Session gone when the server no longer has it", async () => {
    const { session, brain, voice } = setup({
      saved: { sessionId: "deleted", turns: [] },
    })

    session.sendTypedMessage("Hola")
    await flush()
    brain.fail(new SessionGoneError())
    await flush()

    expect(session.getSnapshot().gone).toBe(true)
    expect(session.getSnapshot().state).toBe("idle")
    expect(voice.spoken).toEqual([])
  })

  it("clears the hint when the Owner sends a typed message", async () => {
    const { session } = setup({ listener: fakeListener({ durationMs: 100 }) })

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()
    session.sendTypedMessage("Hola")

    expect(session.getSnapshot().hint).toBeNull()
  })

  it("shows the Reply's Memory events on its entry, without speaking them", async () => {
    const { session, brain, voice } = setup()
    const memoryEvents: MemoryEvent[] = [
      { kind: "remembered", title: "Su hermana" },
    ]

    session.sendTypedMessage("Recuerda que mi hermana se llama Lucía")
    await flush()
    brain.answer("Lo recordaré, señor.", [], "family", memoryEvents)
    await flush()
    voice.finish()
    await flush()

    expect(session.getSnapshot().transcript).toMatchObject([
      { role: "owner", text: "Recuerda que mi hermana se llama Lucía" },
      { role: "jarvis", text: "Lo recordaré, señor.", memoryEvents },
    ])
    expect(session.getSnapshot().transcript).toHaveLength(2)
    expect(voice.spoken).toEqual(["Lo recordaré, señor."])
  })

  it("shows a saved Turn's Memory events when resuming, and never sends them", async () => {
    const memoryEvents: MemoryEvent[] = [
      { kind: "forgotten", title: "Su trabajo" },
    ]
    const { session, brain } = setup({
      saved: {
        sessionId: "work",
        turns: [
          {
            owner: "Olvida lo de mi trabajo",
            reply: "Hecho, señor.",
            memoryEvents,
          },
        ],
      },
    })

    expect(session.getSnapshot().transcript).toMatchObject([
      { role: "owner" },
      { role: "jarvis", text: "Hecho, señor.", memoryEvents },
    ])

    session.sendTypedMessage("Gracias")
    await flush()

    expect(brain.calls).toEqual([{ sessionId: "work", text: "Gracias" }])
  })

  it("applies the Reply's Widget changes before Speaking", async () => {
    const { session, brain, widgets, events } = setup()

    session.sendTypedMessage("Oculta el tiempo")
    await flush()
    brain.answer("Hecho, señor.", [{ type: "hide", id: "weather" }])
    await flush()

    expect(widgets.applied).toEqual([[{ type: "hide", id: "weather" }]])
    expect(events).toEqual(["apply widget changes", "speak"])
  })

  it("applies no Widget changes when the Turn fails", async () => {
    const { session, brain, widgets } = setup()

    session.sendTypedMessage("Oculta el tiempo")
    await flush()
    brain.fail(new Error("Nan 500"))
    await flush()

    expect(widgets.applied).toEqual([])
  })

  describe("Interrupted Reply", () => {
    const STORY = "Había una vez un mayordomo muy paciente."

    /** A typed Turn whose Reply is now being spoken. */
    async function speaking(ctx: ReturnType<typeof setup>) {
      ctx.session.sendTypedMessage("Cuéntame algo")
      await flush()
      ctx.brain.answer(STORY)
      await flush()
      expect(ctx.session.getSnapshot().state).toBe("speaking")
    }

    const replyEntry = (ctx: ReturnType<typeof setup>) =>
      ctx.session.getSnapshot().transcript.find(({ role }) => role === "jarvis")

    it("marks a Reply cut by a hold as cut short, with the share played, and sends the mark", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.playsUpTo(0.4)

      ctx.session.pressPushToTalk()
      await flush()

      expect(replyEntry(ctx)).toMatchObject({
        text: STORY,
        interrupted: { cut: 0.4 },
      })

      ctx.session.releasePushToTalk()
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Hola Jarvis",
        interrupted: { cut: 0.4 },
      })
    })

    it("marks a Reply cut by typing as cut short, and sends the mark", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.playsUpTo(0.25)

      ctx.session.sendTypedMessage("Basta")
      await flush()

      expect(replyEntry(ctx)).toMatchObject({ interrupted: { cut: 0.25 } })
      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Basta",
        interrupted: { cut: 0.25 },
      })
    })

    it("sends the mark only with the next Turn", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.session.sendTypedMessage("Basta")
      await flush()
      ctx.brain.answer("Como quiera, señor.")
      await flush()
      ctx.voice.finish()
      await flush()

      ctx.session.sendTypedMessage("Gracias")
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Gracias",
      })
    })

    it("sends the mark again when the Turn carrying it fails", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.playsUpTo(0.4)
      ctx.session.sendTypedMessage("Basta")
      await flush()
      ctx.brain.fail(new Error("Nan 500"))
      await flush()

      ctx.session.sendTypedMessage("Basta, por favor")
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Basta, por favor",
        interrupted: { cut: 0.4 },
      })
    })

    it("leaves a Reply heard whole unmarked", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.finish()
      await flush()

      ctx.session.sendTypedMessage("Otra")
      await flush()

      expect(replyEntry(ctx)).not.toHaveProperty("interrupted")
      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Otra",
      })
    })

    it("treats a Reply that fails to be spoken as an error, not an Interrupted Reply", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.fail(new DOMException("blocked", "NotAllowedError"))
      await flush()

      ctx.session.sendTypedMessage("¿Me oyes?")
      await flush()

      expect(replyEntry(ctx)).not.toHaveProperty("interrupted")
      expect(ctx.transcript()).toContainEqual({
        role: "error",
        text: expect.stringMatching(/reproducir/i),
      })
      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "¿Me oyes?",
      })
    })

    it("shows saved Interrupted Replies with their mark when resuming, and sends no mark", async () => {
      const { session, brain } = setup({
        saved: {
          sessionId: "story",
          turns: [
            {
              owner: "Cuéntame algo",
              reply: STORY,
              interrupted: { cut: 0.4 },
            },
            {
              owner: "Otra",
              reply: "Érase un robot.",
              interrupted: { unspoken: true },
            },
          ],
        },
      })

      expect(session.getSnapshot().transcript).toEqual([
        { id: 0, role: "owner", text: "Cuéntame algo" },
        { id: 1, role: "jarvis", text: STORY, interrupted: { cut: 0.4 } },
        { id: 2, role: "owner", text: "Otra" },
        {
          id: 3,
          role: "jarvis",
          text: "Érase un robot.",
          interrupted: { unspoken: true },
        },
      ])

      session.sendTypedMessage("Sigue")
      await flush()

      expect(brain.calls).toEqual([{ sessionId: "story", text: "Sigue" }])
    })
  })

  describe("Search Outcome", () => {
    const flights: SearchOutcome = {
      kind: "flights",
      heading: "Vuelos MAD → FCO · vie 16 oct",
      results: [
        { title: "Iberia", facts: [{ label: "Precio", value: "412 €" }] },
        { title: "Ryanair", facts: [{ label: "Precio", value: "104 €" }] },
      ],
    }
    const news: SearchOutcome = {
      kind: "news",
      heading: "Noticias: Real Madrid",
      results: [],
    }

    async function turn(
      { session, brain, voice }: ReturnType<typeof setup>,
      reply: Partial<Reply> & { text: string }
    ) {
      session.sendTypedMessage("Hola")
      await flush()
      brain.reply(reply)
      await flush()
      voice.finish()
      await flush()
    }

    it("has none in a new or resumed Session", () => {
      expect(setup().session.getSnapshot().search).toBeNull()
      expect(
        setup({
          saved: {
            sessionId: "s",
            turns: [{ owner: "Hola", reply: "Hola." }],
          },
        }).session.getSnapshot().search
      ).toBeNull()
    })

    it("is replaced by a Reply that carries one", async () => {
      const jarvis = setup()

      await turn(jarvis, { text: "Hay dos vuelos.", search: flights })
      expect(jarvis.session.getSnapshot().search).toEqual(flights)

      await turn(jarvis, { text: "No encontré noticias.", search: news })
      expect(jarvis.session.getSnapshot().search).toEqual(news)
    })

    it("is kept by a Reply that doesn't search", async () => {
      const jarvis = setup()
      await turn(jarvis, { text: "Hay dos vuelos.", search: flights })

      await turn(jarvis, { text: "De nada." })

      expect(jarvis.session.getSnapshot().search).toEqual(flights)
    })

    it("goes with the next Turn, so the Results on screen can be sent", async () => {
      const jarvis = setup()
      await turn(jarvis, { text: "Hay dos vuelos.", search: flights })

      jarvis.session.sendTypedMessage("¿Y el segundo?")
      await flush()

      expect(jarvis.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "¿Y el segundo?",
        search: flights,
      })
    })

    it("is in place before Speaking, with the Widget changes", async () => {
      const { session, brain } = setup()
      session.sendTypedMessage("Vuelos a Roma")
      await flush()

      brain.reply({ text: "Hay dos vuelos.", search: flights })
      await flush()

      expect(session.getSnapshot().state).toBe("speaking")
      expect(session.getSnapshot().search).toEqual(flights)
    })
  })

  describe("Browse Task", () => {
    const view = (overrides: Partial<BrowseView> = {}): BrowseView => ({
      task: "Mira el horario del Prado",
      startUrl: "https://www.museodelprado.es",
      status: "running",
      currentGoal: "I will open the visit page.",
      currentUrl: "https://www.museodelprado.es/visita",
      liveViewUrl: "https://live.browser-use.com?wss=x",
      screenshotUrl: null,
      outcome: null,
      success: null,
      startedAt: new Date("2026-10-14T12:00:00Z"),
      endedAt: null,
      ...overrides,
    })
    const running = view()
    const finished = view({
      status: "finished",
      outcome: "Abre de 10:00 a 20:00.",
      success: true,
      liveViewUrl: null,
      endedAt: new Date("2026-10-14T12:02:00Z"),
    })
    const showBrowser: WidgetChange = { type: "show", id: "browser" }

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    /** Lets due timers fire and pending promises settle. */
    const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms)

    it("loads the view once when the Session starts watching, and doesn't poll with no Browse Task", async () => {
      const jarvis = setup()

      jarvis.session.watchBrowse()
      await tick(BROWSE_POLL_MS * 3)

      expect(jarvis.browse.loads()).toBe(1)
      expect(jarvis.session.getSnapshot().browse).toBeNull()
    })

    it("polls while the Browse Task runs, and stops once it has ended", async () => {
      const browse = fakeBrowse([running, running, finished])
      const jarvis = setup({ browse })

      jarvis.session.watchBrowse()
      await tick()
      expect(jarvis.session.getSnapshot().browse).toEqual(running)

      await tick(BROWSE_POLL_MS)
      expect(browse.loads()).toBe(2)
      await tick(BROWSE_POLL_MS)
      expect(browse.loads()).toBe(3)
      expect(jarvis.session.getSnapshot().browse).toEqual(finished)

      await tick(BROWSE_POLL_MS * 5)
      expect(browse.loads()).toBe(3)
    })

    it("Shows the Browser Widget and highlights it when it sees the Browse Task end", async () => {
      const jarvis = setup({ browse: fakeBrowse([running, finished]) })
      jarvis.session.watchBrowse()
      await tick()
      expect(jarvis.widgets.applied).toEqual([])
      expect(jarvis.session.getSnapshot().browseJustEnded).toBe(false)

      await tick(BROWSE_POLL_MS)

      expect(jarvis.widgets.applied).toEqual([[showBrowser]])
      expect(jarvis.session.getSnapshot().browseJustEnded).toBe(true)
    })

    it("gives no cue when the Owner stopped the Browse Task by voice", async () => {
      const stopped = view({ status: "stopped", liveViewUrl: null })
      const jarvis = setup({ browse: fakeBrowse([running, stopped]) })
      jarvis.session.watchBrowse()
      await tick()

      jarvis.session.sendTypedMessage("Para")
      await tick()
      jarvis.brain.answer("Hecho, la he parado.")
      await tick()

      expect(jarvis.session.getSnapshot().browse).toEqual(stopped)
      expect(jarvis.session.getSnapshot().browseJustEnded).toBe(false)
      expect(jarvis.widgets.applied).toEqual([[]])
    })

    it("leaves the Browser Widget alone for a Browse Task that had already ended", async () => {
      const jarvis = setup({ browse: fakeBrowse([finished]) })

      jarvis.session.watchBrowse()
      await tick(BROWSE_POLL_MS)

      expect(jarvis.session.getSnapshot().browse).toEqual(finished)
      expect(jarvis.session.getSnapshot().browseJustEnded).toBe(false)
      expect(jarvis.widgets.applied).toEqual([])
    })

    it("starts polling once a Reply starts a Browse Task", async () => {
      const browse = fakeBrowse([null, running])
      const jarvis = setup({ browse })
      jarvis.session.watchBrowse()
      await tick()

      jarvis.session.sendTypedMessage("Sí, míralo")
      await tick()
      jarvis.brain.answer("Me pongo con ello.", [showBrowser])
      await tick()

      expect(browse.loads()).toBe(2)
      expect(jarvis.session.getSnapshot().browse).toEqual(running)
      await tick(BROWSE_POLL_MS)
      expect(browse.loads()).toBe(3)
    })

    it("keeps the last view and keeps polling when a load fails", async () => {
      const browse = fakeBrowse([running, new Error("offline"), running])
      const jarvis = setup({ browse })
      jarvis.session.watchBrowse()
      await tick()

      await tick(BROWSE_POLL_MS)
      expect(jarvis.session.getSnapshot().browse).toEqual(running)

      await tick(BROWSE_POLL_MS)
      expect(browse.loads()).toBe(3)
    })

    it("stops polling when the Owner leaves the Session", async () => {
      const browse = fakeBrowse([running])
      const jarvis = setup({ browse })
      jarvis.session.watchBrowse()
      await tick()

      jarvis.session.teardown()
      await tick(BROWSE_POLL_MS * 3)

      expect(browse.loads()).toBe(1)
    })

    it("stops the Browse Task from the Widget, without Showing or highlighting it", async () => {
      const browse = fakeBrowse([running])
      const stopped = view({ status: "stopped", liveViewUrl: null })
      browse.stopsWith(stopped)
      const jarvis = setup({ browse })
      jarvis.session.watchBrowse()
      await tick()

      await jarvis.session.stopBrowse()
      await tick(BROWSE_POLL_MS * 3)

      expect(browse.stops).toHaveLength(1)
      expect(jarvis.session.getSnapshot().browse).toEqual(stopped)
      expect(jarvis.session.getSnapshot().browseJustEnded).toBe(false)
      expect(jarvis.widgets.applied).toEqual([])
      expect(browse.loads()).toBe(1)
    })
  })

  describe("Hands-free", () => {
    it("is off in a new Session, with the mic closed", () => {
      const { session, listener } = setup()

      expect(session.getSnapshot()).toMatchObject({
        handsFree: false,
        micOpen: false,
      })
      expect(listener.calls).toEqual([])
    })

    it("turns on with a tap, opening the mic, and off with another, closing it", async () => {
      const { session, listener } = setup()

      session.tap()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        state: "idle",
        handsFree: true,
        micOpen: true,
      })
      expect(listener.calls).toEqual(["open"])

      session.tap()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        state: "idle",
        handsFree: false,
        micOpen: false,
      })
      expect(listener.calls).toEqual(["open", "close"])
    })

    it("completes a Turn on its own: Idle → Listening → Thinking → Speaking → Idle, still on", async () => {
      const {
        session,
        listener,
        transcriber,
        brain,
        voice,
        states,
        transcript,
      } = setup({ transcriber: fakeTranscriber((audio) => audio.text()) })
      session.tap()
      await flush()

      listener.fire.speechStarted()
      listener.fire.pieceReady(listener.audio("¿Qué hora es?"), 1200)
      await flush()

      expect(session.getSnapshot().state).toBe("listening")
      expect(transcriber.calls).toHaveLength(1)
      expect(brain.calls).toEqual([])

      listener.fire.endOfTurn()
      await flush()

      expect(brain.calls).toEqual([{ text: "¿Qué hora es?" }])

      brain.answer("Son las cinco, señor.")
      await flush()
      voice.finish()
      await flush()

      expect(states).toEqual([
        "idle",
        "listening",
        "thinking",
        "speaking",
        "idle",
      ])
      expect(transcript()).toEqual([
        { role: "owner", text: "¿Qué hora es?" },
        { role: "jarvis", text: "Son las cinco, señor." },
      ])
      expect(session.getSnapshot()).toMatchObject({
        handsFree: true,
        micOpen: true,
      })
      expect(listener.calls).toEqual(["open"])
    })

    it("joins two pieces into one message, each Transcribed once, asking the Brain once the last text is back", async () => {
      const heard = new Map<string, Deferred<string>>()
      const { session, listener, transcriber, brain, transcript } = setup({
        transcriber: fakeTranscriber(async (audio) => {
          const text = deferred<string>()
          heard.set(await audio.text(), text)
          return text.promise
        }),
      })
      session.tap()
      await flush()

      listener.fire.speechStarted()
      listener.fire.pieceReady(listener.audio("Pon una alarma"), 1500)
      await flush()

      expect(transcriber.calls).toHaveLength(1)

      listener.fire.pieceReady(listener.audio("a las siete"), 900)
      listener.fire.endOfTurn()
      await flush()

      expect(transcriber.calls).toHaveLength(2)
      expect(session.getSnapshot().state).toBe("thinking")

      heard.get("a las siete")!.resolve("a las siete.")
      await flush()

      expect(brain.calls).toEqual([])

      heard.get("Pon una alarma")!.resolve(" Pon una alarma ")
      await flush()

      expect(transcriber.calls).toHaveLength(2)
      expect(brain.calls).toEqual([{ text: "Pon una alarma a las siete." }])
      expect(transcript()).toEqual([
        { role: "owner", text: "Pon una alarma a las siete." },
      ])
    })

    it("drops an Utterance with no words silently, with no hint", async () => {
      const { session, listener, brain, transcript } = setup({
        transcriber: fakeTranscriber(""),
      })
      session.tap()
      await flush()

      listener.fire.speechStarted()
      listener.fire.pieceReady(listener.audio(), 300)
      listener.fire.endOfTurn()
      await flush()

      expect(brain.calls).toEqual([])
      expect(transcript()).toEqual([])
      expect(session.getSnapshot()).toMatchObject({
        state: "idle",
        hint: null,
        handsFree: true,
      })
    })

    it("hears nothing on its own while off", async () => {
      const { session, listener, transcriber } = setup()

      listener.fire.speechStarted()
      listener.fire.pieceReady(listener.audio(), 1000)
      listener.fire.endOfTurn()
      await flush()

      expect(session.getSnapshot().state).toBe("idle")
      expect(transcriber.calls).toEqual([])
    })

    it("drops the Utterance being heard when turned off, closing the mic", async () => {
      const { session, listener, transcriber, brain } = setup()
      session.tap()
      await flush()
      listener.fire.speechStarted()
      await flush()

      session.tap()
      await flush()
      listener.fire.pieceReady(listener.audio(), 1000)
      listener.fire.endOfTurn()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        state: "idle",
        handsFree: false,
        micOpen: false,
      })
      expect(listener.calls).toEqual(["open", "close"])
      expect(transcriber.calls).toEqual([])
      expect(brain.calls).toEqual([])
    })

    it("keeps the mic open after a hold while on", async () => {
      const { session, listener, brain } = setup()
      session.tap()
      await flush()

      session.pressPushToTalk()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
      expect(listener.calls).toEqual(["open", "holdStart", "holdEnd"])
      expect(session.getSnapshot()).toMatchObject({
        handsFree: true,
        micOpen: true,
      })
    })

    it("keeps the hint for a Push-to-talk hold with no words", async () => {
      const { session, brain } = setup({ transcriber: fakeTranscriber("") })
      session.tap()
      await flush()

      session.pressPushToTalk()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(brain.calls).toEqual([])
      expect(session.getSnapshot().hint).toBe(DISCARDED_UTTERANCE_HINT)
    })

    it("shows the mic open during a hold while off, and closed after it", async () => {
      const { session } = setup()

      session.pressPushToTalk()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        handsFree: false,
        micOpen: true,
      })

      session.releasePushToTalk()
      await flush()

      expect(session.getSnapshot().micOpen).toBe(false)
    })

    it("waits for a hold's release before closing the mic when turned off", async () => {
      const { session, listener, brain } = setup()
      session.tap()
      await flush()
      session.pressPushToTalk()
      await flush()

      session.setHandsFree(false)
      await flush()

      expect(listener.calls).toEqual(["open", "holdStart"])
      expect(session.getSnapshot()).toMatchObject({
        state: "listening",
        handsFree: false,
        micOpen: true,
      })

      session.releasePushToTalk()
      await flush()

      expect(brain.calls).toEqual([{ text: "Hola Jarvis" }])
      expect(listener.calls).toEqual(["open", "holdStart", "holdEnd", "close"])
      expect(session.getSnapshot().micOpen).toBe(false)
    })

    it("turns off, showing the microphone error, when the mic is denied", async () => {
      const { session } = setup({
        listener: fakeListener({
          openError: new DOMException("denied", "NotAllowedError"),
        }),
      })

      session.tap()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        handsFree: false,
        micOpen: false,
      })
      expect(session.getSnapshot().transcript.at(-1)).toMatchObject({
        role: "error",
        text: expect.stringMatching(/micrófono/i),
      })
    })

    it("is off after teardown, with the mic closed", async () => {
      const { session, listener } = setup()
      session.tap()
      await flush()

      session.teardown()
      await flush()

      expect(session.getSnapshot()).toMatchObject({
        handsFree: false,
        micOpen: false,
      })
      expect(listener.calls).toEqual(["open", "close"])
    })
  })

  describe("Barge-in, while Speaking", () => {
    const STORY = "Había una vez un mayordomo muy paciente."

    /** Hands-free on (unless `off`) and a typed Turn's Reply being spoken. */
    async function speaking(
      ctx: ReturnType<typeof setup>,
      { off = false } = {}
    ) {
      if (!off) ctx.session.tap()
      await flush()
      ctx.session.sendTypedMessage("Cuéntame algo")
      await flush()
      ctx.brain.answer(STORY)
      await flush()
      expect(ctx.session.getSnapshot().state).toBe("speaking")
    }

    const replyEntry = (ctx: ReturnType<typeof setup>) =>
      ctx.session.getSnapshot().transcript.find(({ role }) => role === "jarvis")

    it("puts the Listener on the stricter interrupt gate while Speaking, and back after", async () => {
      const ctx = setup()
      await speaking(ctx)

      expect(ctx.listener.speaking).toEqual(["bargeIn"])

      ctx.voice.finish()
      await flush()

      expect(ctx.listener.speaking).toEqual(["bargeIn", false])
    })

    it("cuts the Reply when the Owner talks over it, and what they said becomes the next Utterance", async () => {
      const ctx = setup({
        transcriber: fakeTranscriber((audio) => audio.text()),
      })
      await speaking(ctx)
      ctx.voice.playsUpTo(0.3)

      ctx.listener.fire.speechStarted()
      await flush()

      expect(ctx.voice.stopped()).toBe(1)
      expect(replyEntry(ctx)).toMatchObject({
        text: STORY,
        interrupted: { cut: 0.3 },
      })
      expect(ctx.session.getSnapshot()).toMatchObject({
        state: "listening",
        handsFree: true,
      })
      expect(ctx.listener.speaking).toEqual(["bargeIn", false])

      ctx.listener.fire.pieceReady(ctx.listener.audio("No, espera"), 900)
      ctx.listener.fire.endOfTurn()
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "No, espera",
        interrupted: { cut: 0.3 },
      })
      expect(ctx.transcript().at(-1)).toEqual({
        role: "owner",
        text: "No, espera",
      })
      expect(ctx.states).toEqual([
        "idle",
        "thinking",
        "speaking",
        "listening",
        "thinking",
      ])
    })

    it("stops only the Reply on a tap, leaving Hands-free on", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.playsUpTo(0.6)

      ctx.session.tap()
      await flush()

      expect(ctx.voice.stopped()).toBe(1)
      expect(replyEntry(ctx)).toMatchObject({ interrupted: { cut: 0.6 } })
      expect(ctx.session.getSnapshot()).toMatchObject({
        state: "idle",
        handsFree: true,
        micOpen: true,
      })
      expect(ctx.listener.calls).toEqual(["open"])
      expect(ctx.cues.played).toEqual(["handsFreeOn", "turnSent"])
    })

    it("stops only the Reply on a tap, leaving Hands-free off", async () => {
      const ctx = setup()
      await speaking(ctx, { off: true })

      ctx.session.tap()
      await flush()

      expect(ctx.voice.stopped()).toBe(1)
      expect(replyEntry(ctx)).toMatchObject({ interrupted: { cut: 0.5 } })
      expect(ctx.session.getSnapshot()).toMatchObject({
        state: "idle",
        handsFree: false,
        micOpen: false,
      })
      expect(ctx.listener.calls).toEqual([])
    })

    it("hears the Owner again once a tap has stopped the Reply", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.session.tap()
      await flush()

      ctx.listener.fire.speechStarted()
      ctx.listener.fire.pieceReady(ctx.listener.audio(), 900)
      ctx.listener.fire.endOfTurn()
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Hola Jarvis",
        interrupted: { cut: 0.5 },
      })
    })

    it("cuts the Reply on a hold and starts Push-to-talk, Hands-free staying on", async () => {
      const ctx = setup()
      await speaking(ctx)
      ctx.voice.playsUpTo(0.2)

      ctx.session.pressPushToTalk()
      await flush()

      expect(ctx.voice.stopped()).toBe(1)
      expect(replyEntry(ctx)).toMatchObject({ interrupted: { cut: 0.2 } })
      expect(ctx.session.getSnapshot()).toMatchObject({
        state: "listening",
        handsFree: true,
      })

      ctx.session.releasePushToTalk()
      await flush()

      expect(ctx.brain.calls.at(-1)).toEqual({
        sessionId: "session-1",
        text: "Hola Jarvis",
        interrupted: { cut: 0.2 },
      })
      expect(ctx.listener.calls).toEqual(["open", "holdStart", "holdEnd"])
      expect(ctx.session.getSnapshot().handsFree).toBe(true)
    })

    describe("half duplex, with barge-in off as in the Jarvis App", () => {
      it("tells the Listener to hear nothing while Speaking, and to hear again after", async () => {
        const ctx = setup({ bargeIn: false })
        await speaking(ctx)

        expect(ctx.listener.speaking).toEqual(["halfDuplex"])

        ctx.voice.finish()
        await flush()

        expect(ctx.listener.speaking).toEqual(["halfDuplex", false])
      })

      it("ignores the Listener's events while Speaking", async () => {
        const ctx = setup({ bargeIn: false })
        await speaking(ctx)

        ctx.listener.fire.speechStarted()
        ctx.listener.fire.pieceReady(ctx.listener.audio(), 900)
        ctx.listener.fire.endOfTurn()
        await flush()

        expect(ctx.voice.stopped()).toBe(0)
        expect(replyEntry(ctx)?.interrupted).toBeUndefined()
        expect(ctx.session.getSnapshot().state).toBe("speaking")
        expect(ctx.transcriber.calls).toEqual([])
        expect(ctx.brain.calls).toHaveLength(1)
      })

      it("still cuts the Reply on a tap or a hold", async () => {
        const ctx = setup({ bargeIn: false })
        await speaking(ctx)

        ctx.session.tap()
        await flush()

        expect(replyEntry(ctx)).toMatchObject({ interrupted: { cut: 0.5 } })
        expect(ctx.session.getSnapshot()).toMatchObject({
          state: "idle",
          handsFree: true,
        })

        ctx.session.sendTypedMessage("Otra")
        await flush()
        ctx.brain.answer("Otra historia.")
        await flush()
        ctx.voice.playsUpTo(0.1)
        ctx.session.pressPushToTalk()
        await flush()

        expect(ctx.session.getSnapshot().transcript.at(-1)).toMatchObject({
          text: "Otra historia.",
          interrupted: { cut: 0.1 },
        })
        expect(ctx.session.getSnapshot().state).toBe("listening")
      })

      it("hears the Owner again once the Reply is over", async () => {
        const ctx = setup({ bargeIn: false })
        await speaking(ctx)
        ctx.voice.finish()
        await flush()

        ctx.listener.fire.speechStarted()
        ctx.listener.fire.pieceReady(ctx.listener.audio(), 900)
        ctx.listener.fire.endOfTurn()
        await flush()

        expect(ctx.brain.calls.at(-1)).toEqual({
          sessionId: "session-1",
          text: "Hola Jarvis",
        })
      })
    })

    it("tells the Listener Speaking is over when the Session is torn down mid-Reply", async () => {
      const ctx = setup()
      await speaking(ctx)

      ctx.session.teardown()

      expect(ctx.listener.speaking).toEqual(["bargeIn", false])
    })
  })

  describe("Cues", () => {
    it("plays the on cue when Hands-free turns on, and the off cue when it turns off", async () => {
      const { session, cues } = setup()

      session.tap()
      await flush()
      session.tap()
      await flush()
      session.setHandsFree(true)
      await flush()
      session.setHandsFree(false)
      await flush()

      expect(cues.played).toEqual([
        "handsFreeOn",
        "handsFreeOff",
        "handsFreeOn",
        "handsFreeOff",
      ])
    })

    it("plays nothing when Hands-free is set to what it already is", async () => {
      const { session, cues } = setup()

      session.setHandsFree(false)
      session.setHandsFree(true)
      session.setHandsFree(true)
      await flush()

      expect(cues.played).toEqual(["handsFreeOn"])
    })

    it("plays the off cue when a denied mic turns Hands-free off", async () => {
      const { session, cues } = setup({
        listener: fakeListener({
          openError: new DOMException("denied", "NotAllowedError"),
        }),
      })

      session.tap()
      await flush()

      expect(cues.played).toEqual(["handsFreeOn", "handsFreeOff"])
    })

    it("plays no Hands-free cue for a denied mic during a hold while off", async () => {
      const { session, cues } = setup({
        listener: fakeListener({
          openError: new DOMException("denied", "NotAllowedError"),
        }),
      })

      session.pressPushToTalk()
      await flush()

      expect(cues.played).toEqual([])
    })

    it("plays the off cue when teardown turns Hands-free off, and none when it was off", async () => {
      const on = setup()
      on.session.tap()
      await flush()
      on.session.teardown()
      await flush()

      const off = setup()
      off.session.teardown()
      await flush()

      expect(on.cues.played).toEqual(["handsFreeOn", "handsFreeOff"])
      expect(off.cues.played).toEqual([])
    })

    it("acknowledges a typed Turn once, as it is sent", async () => {
      const { session, brain, cues } = setup()

      session.sendTypedMessage("¿Qué hora es?")
      await flush()

      expect(cues.played).toEqual(["turnSent"])

      brain.answer("Son las cinco, señor.")
      await flush()

      expect(cues.played).toEqual(["turnSent"])
    })

    it("acknowledges a Push-to-talk Turn once, as it is sent", async () => {
      const { session, cues } = setup()

      session.pressPushToTalk()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(cues.played).toEqual(["turnSent"])
    })

    it("acknowledges a hands-free Turn once, as it is sent", async () => {
      const { session, listener, cues } = setup()
      session.tap()
      await flush()

      listener.fire.speechStarted()
      listener.fire.pieceReady(listener.audio(), 1000)
      listener.fire.pieceReady(listener.audio(), 1000)
      await flush()

      expect(cues.played).toEqual(["handsFreeOn"])

      listener.fire.endOfTurn()
      await flush()

      expect(cues.played).toEqual(["handsFreeOn", "turnSent"])
    })

    it("acknowledges each Turn of a hands-free conversation", async () => {
      const { session, listener, brain, voice, cues } = setup()
      session.tap()
      await flush()

      for (const _ of [1, 2]) {
        listener.fire.speechStarted()
        listener.fire.pieceReady(listener.audio(), 1000)
        listener.fire.endOfTurn()
        await flush()
        brain.answer("Claro, señor.")
        await flush()
        voice.finish()
        await flush()
      }

      expect(cues.played).toEqual(["handsFreeOn", "turnSent", "turnSent"])
    })

    it("never acknowledges a dropped Utterance", async () => {
      const silent = setup({ transcriber: fakeTranscriber("") })
      silent.session.tap()
      await flush()
      silent.listener.fire.speechStarted()
      silent.listener.fire.pieceReady(silent.listener.audio(), 300)
      silent.listener.fire.endOfTurn()
      await flush()

      const short = setup({ listener: fakeListener({ durationMs: 200 }) })
      short.session.pressPushToTalk()
      await flush()
      short.session.releasePushToTalk()
      await flush()

      const empty = setup({ transcriber: fakeTranscriber("") })
      empty.session.pressPushToTalk()
      await flush()
      empty.session.releasePushToTalk()
      await flush()

      expect(silent.cues.played).toEqual(["handsFreeOn"])
      expect(short.cues.played).toEqual([])
      expect(empty.cues.played).toEqual([])
    })

    it("doesn't acknowledge an Utterance dropped by turning Hands-free off", async () => {
      const { session, listener, cues } = setup()
      session.tap()
      await flush()
      listener.fire.speechStarted()
      await flush()

      session.tap()
      listener.fire.endOfTurn()
      await flush()

      expect(cues.played).toEqual(["handsFreeOn", "handsFreeOff"])
    })

    it("doesn't acknowledge a Turn whose transcription failed", async () => {
      const { session, cues } = setup({
        transcriber: fakeTranscriber(new Error("Whisper down")),
      })

      session.pressPushToTalk()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(cues.played).toEqual([])
    })
  })

  describe("teardown, when the Owner switches Sessions", () => {
    it("stops the Voice at once while Speaking", async () => {
      const { session, brain, voice } = setup()
      session.sendTypedMessage("Cuéntame algo")
      await flush()
      brain.answer("Había una vez un mayordomo muy paciente.")
      await flush()

      session.teardown()
      await flush()

      expect(voice.stopped()).toBe(1)
      expect(session.getSnapshot().state).toBe("idle")
    })

    it("ignores a Reply that arrives after it", async () => {
      const { session, brain, voice, widgets, transcript } = setup()
      session.sendTypedMessage("¿Llueve?")
      await flush()

      session.teardown()
      brain.answer("No, señor.", [{ type: "hide", id: "weather" }], "trip")
      await flush()

      expect(voice.spoken).toEqual([])
      expect(widgets.applied).toEqual([])
      expect(session.getSnapshot().state).toBe("idle")
      expect(session.getSnapshot().sessionId).toBeNull()
      expect(transcript()).toEqual([{ role: "owner", text: "¿Llueve?" }])
    })

    it("ignores a failure that arrives after it", async () => {
      const { session, brain, transcript } = setup()
      session.sendTypedMessage("¿Llueve?")
      await flush()

      session.teardown()
      brain.fail(new Error("Nan 500"))
      await flush()

      expect(transcript()).toEqual([{ role: "owner", text: "¿Llueve?" }])
    })

    it("releases the mic when it lands before the hold's audio comes back", async () => {
      const listener = fakeListener({ manual: true })
      const { session, brain } = setup({ listener })
      session.pressPushToTalk()
      await flush()
      session.releasePushToTalk()
      await flush()

      session.teardown()
      await flush()
      listener.fire.pieceReady(listener.audio(), 2000)
      listener.fire.endOfTurn()
      await flush()

      expect(listener.calls).toEqual(["holdStart", "open", "holdEnd", "close"])
      expect(brain.calls).toEqual([])
      expect(session.getSnapshot().state).toBe("idle")
    })

    it("stops capturing an Utterance and never sends it", async () => {
      const { session, listener, transcriber, brain } = setup()
      session.pressPushToTalk()
      await flush()

      session.teardown()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(listener.calls).toEqual(["holdStart", "open", "close"])
      expect(transcriber.calls).toEqual([])
      expect(brain.calls).toEqual([])
      expect(session.getSnapshot().state).toBe("idle")
    })
  })
})
