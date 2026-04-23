import Anthropic from '@anthropic-ai/sdk'

// Wrap anthropic.messages.create with retry-on-429. Each retry waits an exponentially
// longer time (2s, 8s, 32s) to let the rate-limit window slide.
// Max 3 retries. Non-429 errors bubble up immediately.
export async function createWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 3
): Promise<Anthropic.Message> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (err) {
      lastError = err
      // Only retry on rate limit errors
      const msg = err instanceof Error ? err.message : String(err)
      const isRateLimit = msg.includes('429') || msg.includes('rate_limit')
      if (!isRateLimit || attempt === maxRetries) {
        throw err
      }
      const waitMs = Math.pow(4, attempt) * 2000 // 2s, 8s, 32s
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
  }
  throw lastError
}
