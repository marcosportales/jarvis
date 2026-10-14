"use server"

import { generateSessionTitle, getSessions } from "@/lib/sessions/server"
import { titleSession as titleWithModel } from "@/lib/sessions/titles"

/** One page of the "Sesiones" list, newest activity first. */
export async function listSessions(cursor?: string) {
  return getSessions().list(cursor)
}

/**
 * Gives a new Session its Session Title. Called after the first Reply is
 * returned, so generating it never delays the Reply.
 */
export async function titleSession(sessionId: string) {
  await titleWithModel(sessionId, {
    store: getSessions(),
    generate: generateSessionTitle,
  })
}

/** Permanently deletes a Session and its Turns. */
export async function deleteSession(sessionId: string) {
  await getSessions().delete(sessionId)
}
