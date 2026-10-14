/**
 * DeepSeek on Nan reasons before every answer unless told not to. Measured in
 * October 2026 with Jarvis's system prompt, that was most of a Turn's wait:
 * about 1–1.5 s per model step, and about three times the completion tokens,
 * with the same tool calls without it. The AI SDK's OpenAI provider has no
 * option for it, so the chat requests are changed on their way out.
 */
export function withoutReasoning(send: typeof fetch): typeof fetch {
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (!url.endsWith("/chat/completions") || typeof init?.body !== "string") {
      return send(input, init)
    }
    const body = JSON.parse(init.body) as Record<string, unknown>
    const kwargs = body.chat_template_kwargs as object | undefined
    return send(input, {
      ...init,
      body: JSON.stringify({
        ...body,
        chat_template_kwargs: { ...kwargs, thinking: false },
      }),
    })
  }
}
