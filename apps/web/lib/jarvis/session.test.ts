import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BROWSE_POLL_MS, SessionGoneError, type Reply } from "./session"
import {
  fakeBrowse,
  fakeRecorder,
  fakeTranscriber,
  flush,
  setup,
} from "./session-fakes"
import type { BrowseView } from "../browse/view"
import type { MemoryEvent } from "../memory/events"
import type { SearchOutcome } from "../search/outcome"
import type { WidgetChange } from "../widgets/changes"

describe("Jarvis Session", () => {
  it("completes a spoken Turn: Listening → Thinking → Speaking → Idle", async () => {
    const { session, recorder, transcriber, brain, voice, states, transcript } =
      setup()

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()

    expect(recorder.calls).toEqual(["start", "stop"])
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
    const { session, recorder, brain, voice, states, transcript } = setup()

    session.sendTypedMessage("¿Qué hora es?")
    await flush()
    brain.answer("Son las cinco, señor.")
    await flush()
    voice.finish()
    await flush()

    expect(recorder.calls).toEqual([])
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
      recorder: fakeRecorder({ durationMs: 300 }),
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
    const { session } = setup({ recorder: fakeRecorder({ durationMs: 100 }) })

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
    })
  })

  it("ignores push-to-talk and typed messages while Thinking", async () => {
    const { session, recorder, brain, voice, transcript } = setup()
    session.sendTypedMessage("Primero")
    await flush()

    session.pressPushToTalk()
    session.releasePushToTalk()
    session.sendTypedMessage("Segundo")
    await flush()

    expect(session.getSnapshot().state).toBe("thinking")
    expect(recorder.calls).toEqual([])
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
      recorder: fakeRecorder({
        startError: new DOMException("denied", "NotAllowedError"),
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
    const { session } = setup({ recorder: fakeRecorder({ durationMs: 100 }) })

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

    it("stops capturing an Utterance and never sends it", async () => {
      const { session, recorder, transcriber, brain } = setup()
      session.pressPushToTalk()
      await flush()

      session.teardown()
      await flush()
      session.releasePushToTalk()
      await flush()

      expect(recorder.calls).toEqual(["start", "stop"])
      expect(transcriber.calls).toEqual([])
      expect(brain.calls).toEqual([])
      expect(session.getSnapshot().state).toBe("idle")
    })
  })
})
