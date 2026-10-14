import "server-only"

import { generateText } from "ai"

import { getDatabase } from "../db/server"
import { nan, nanConfig } from "../jarvis/server/nan"
import { createSessionStore, type SessionStore } from "./store"
import type { GenerateTitle } from "./titles"

/** The Sessions store over the shared Jarvis database. */
export function getSessions(): SessionStore {
  return createSessionStore(getDatabase())
}

/** Asks the chat model for a short Spanish Session Title. */
export const generateSessionTitle: GenerateTitle = async ({ owner, reply }) => {
  const { text } = await generateText({
    model: nan.chat(nanConfig.chatModel),
    system:
      "Pon un título breve en español (de 3 a 5 palabras) a esta conversación. " +
      "Responde solo con el título, sin comillas ni punto final.",
    prompt: `Usuario: ${owner}\nAsistente: ${reply}`,
  })
  return text
}
