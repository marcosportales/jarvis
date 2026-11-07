import { z } from "zod"

/**
 * How a Reply became an Interrupted Reply: cut short while Speaking, with the
 * share of its audio that was played (0 to 1), or shown but never spoken.
 */
export type Interrupted = { cut: number } | { unspoken: true }

/** An Interrupted Reply mark as a Turn request carries it. */
export const interruptedSchema = z.union([
  z.strictObject({ cut: z.number().min(0).max(1) }),
  z.strictObject({ unspoken: z.literal(true) }),
]) satisfies z.ZodType<Interrupted, unknown>

/** The share played, as a whole percentage. */
function percentOf({ cut }: { cut: number }) {
  return Math.round(cut * 100)
}

/**
 * The start of the Reply the Owner heard, estimated as the same share of its
 * text as of its audio, ending on a whole word.
 */
function heardPart(reply: string, share: number) {
  const cut = reply.slice(0, Math.round(reply.length * share))
  const lastSpace = cut.lastIndexOf(" ")
  const whole = cut.length < reply.length && lastSpace > 0
  return (whole ? cut.slice(0, lastSpace) : cut).trim()
}

/**
 * What the model is told ahead of the Owner's next message about the Reply
 * before it: that the Owner didn't hear it, or heard only about its start.
 */
export function interruptedNote(mark: Interrupted, reply: string) {
  const heard = "cut" in mark ? heardPart(reply, mark.cut) : ""
  if (!("cut" in mark) || !heard) {
    return "(Nota: el dueño no oyó tu respuesta anterior; no des por hecho que sabe lo que decía.)"
  }
  return `(Nota: el dueño interrumpió tu respuesta anterior y solo oyó más o menos el primer ${percentOf(mark)} %: «${heard}…». No des por hecho que oyó el resto.)`
}

/** How the Transcript and the Caption mark an Interrupted Reply. */
export function interruptedLabel(mark: Interrupted) {
  return "cut" in mark
    ? `Interrumpida · oída hasta el ${percentOf(mark)} %`
    : "Interrumpida · no dicha en voz alta"
}
