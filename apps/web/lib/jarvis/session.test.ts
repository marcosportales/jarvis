import { describe, expect, it } from "vitest"

import {
  createJarvisSession,
  type Brain,
  type JarvisState,
  type Recorder,
  type Transcriber,
  type Voice,
} from "./session"

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function fakeRecorder(
  options: { durationMs?: number; startError?: unknown } = {}
) {
  const calls: string[] = []
  const recorder: Recorder = {
    async start() {
      calls.push("start")
      if (options.startError) throw options.startError
    },
    async stop() {
      calls.push("stop")
      return {
        audio: new Blob(["audio"], { type: "audio/webm" }),
        durationMs: options.durationMs ?? 2000,
      }
    },
  }
  return { recorder, calls }
}

function fakeTranscriber(text: string | Error = "Hola Jarvis") {
  const calls: Blob[] = []
  const transcriber: Transcriber = {
    async transcribe(audio) {
      calls.push(audio)
      if (text instanceof Error) throw text
      return text
    },
  }
  return { transcriber, calls }
}

function fakeBrain() {
  const calls: Parameters<Brain["reply"]>[0][] = []
  const pending: Deferred<string>[] = []
  const brain: Brain = {
    reply(turns) {
      calls.push(turns)
      const d = deferred<string>()
      pending.push(d)
      return d.promise
    },
  }
  return {
    brain,
    calls,
    answer: (text: string) => pending.shift()!.resolve(text),
    fail: (error: unknown) => pending.shift()!.reject(error),
  }
}

function fakeVoice() {
  const spoken: string[] = []
  let stopped = 0
  const pending: Deferred<void>[] = []
  const voice: Voice = {
    speak(text) {
      spoken.push(text)
      const d = deferred<void>()
      pending.push(d)
      return d.promise
    },
    stop() {
      stopped++
      pending.shift()?.resolve()
    },
  }
  return {
    voice,
    spoken,
    stopped: () => stopped,
    finish: () => pending.shift()!.resolve(),
    fail: (error: unknown) => pending.shift()!.reject(error),
  }
}

function setup(
  options: {
    recorder?: ReturnType<typeof fakeRecorder>
    transcriber?: ReturnType<typeof fakeTranscriber>
  } = {}
) {
  const recorder = options.recorder ?? fakeRecorder()
  const transcriber = options.transcriber ?? fakeTranscriber()
  const brain = fakeBrain()
  const voice = fakeVoice()
  const session = createJarvisSession({
    recorder: recorder.recorder,
    transcriber: transcriber.transcriber,
    brain: brain.brain,
    voice: voice.voice,
  })
  const states: JarvisState[] = [session.getSnapshot().state]
  session.subscribe(() => {
    const { state } = session.getSnapshot()
    if (states.at(-1) !== state) states.push(state)
  })
  const transcript = () =>
    session.getSnapshot().transcript.map(({ role, text }) => ({ role, text }))
  return { session, recorder, transcriber, brain, voice, states, transcript }
}

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
    expect(brain.calls).toEqual([[{ role: "owner", text: "Hola Jarvis" }]])

    brain.answer("Buenas tardes, señor.")
    await flush()

    expect(voice.spoken).toEqual(["Buenas tardes, señor."])
    expect(session.getSnapshot().state).toBe("speaking")

    voice.finish()
    await flush()

    expect(states).toEqual(["idle", "listening", "thinking", "speaking", "idle"])
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
    expect(brain.calls).toEqual([[{ role: "owner", text: "¿Qué hora es?" }]])
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
    expect(brain.calls.at(-1)).toEqual([
      { role: "owner", text: "Cuéntame algo" },
      { role: "jarvis", text: "Había una vez un mayordomo muy paciente." },
      { role: "owner", text: "Basta" },
    ])
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

    expect(brain.calls).toEqual([[{ role: "owner", text: "¿Me oyes?" }]])
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

  it("passes every earlier Turn to the Brain in order, without inline errors", async () => {
    const { session, brain, voice } = setup()

    session.pressPushToTalk()
    await flush()
    session.releasePushToTalk()
    await flush()
    brain.answer("Buenas tardes, señor.")
    await flush()
    voice.finish()
    await flush()

    session.sendTypedMessage("¿Llueve?")
    await flush()
    brain.fail(new Error("Nan 500"))
    await flush()

    session.sendTypedMessage("¿Llueve hoy?")
    await flush()

    expect(brain.calls.at(-1)).toEqual([
      { role: "owner", text: "Hola Jarvis" },
      { role: "jarvis", text: "Buenas tardes, señor." },
      { role: "owner", text: "¿Llueve?" },
      { role: "owner", text: "¿Llueve hoy?" },
    ])
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
})
