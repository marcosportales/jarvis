import type { SavedTurn, SessionStore } from "./store"

/** Asks the chat model for a Session Title; injected so tests never call it. */
export type GenerateTitle = (firstTurn: SavedTurn) => Promise<string>

/** Drops the quotes, final period and stray whitespace models like to add. */
function tidy(title: string) {
  return title
    .trim()
    .replace(/^["'«“]+|["'»”]+$/g, "")
    .replace(/\.$/, "")
    .trim()
}

/**
 * Gives an untitled Session its Session Title from its first Turn. A failure
 * leaves it untitled, so the list keeps showing its date.
 */
export async function titleSession(
  sessionId: string,
  { store, generate }: { store: SessionStore; generate: GenerateTitle }
) {
  const session = await store.get(sessionId)
  if (!session || session.title) return
  const [firstTurn] = (await store.transcript(sessionId)) ?? []
  if (!firstTurn) return
  try {
    const title = tidy(await generate(firstTurn))
    if (title) await store.setTitle(sessionId, title)
  } catch (error) {
    console.error("Generating the Session Title failed", error)
  }
}
