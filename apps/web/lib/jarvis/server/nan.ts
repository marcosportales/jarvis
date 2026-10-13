import "server-only"

import { createOpenAI } from "@ai-sdk/openai"

/**
 * Every Nan model choice in one place so they can be swapped. The Whisper and
 * Kokoro IDs are best guesses until confirmed against Nan's model list
 * (`GET https://api.nan.builders/v1/models`); override them via env.
 */
export const nanConfig = {
  chatModel: process.env.NAN_CHAT_MODEL ?? "deepseek-v4-flash",
  transcriptionModel: process.env.NAN_TRANSCRIPTION_MODEL ?? "whisper",
  speechModel: process.env.NAN_SPEECH_MODEL ?? "kokoro",
  voice: process.env.NAN_VOICE ?? "em_alex",
}

export const nan = createOpenAI({
  name: "nan",
  baseURL: "https://api.nan.builders/v1",
  apiKey: process.env.NAN_API_KEY,
})
