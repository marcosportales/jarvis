"use server"

import { getSessions } from "@/lib/sessions/server"

/** One page of the "Sesiones" list, newest activity first. */
export async function listSessions(cursor?: string) {
  return getSessions().list(cursor)
}
