/**
 * What Jarvis did to its Memory during a Turn, shown under that Turn's Reply
 * as "Recordado: …" or "Olvidado: …". Never spoken, never sent to the model.
 */
export type MemoryEvent = {
  kind: "remembered" | "forgotten"
  title: string
}

/** How a MemoryEvent reads on screen, before its title. */
export const MEMORY_EVENT_LABELS: Record<MemoryEvent["kind"], string> = {
  remembered: "Recordado",
  forgotten: "Olvidado",
}
