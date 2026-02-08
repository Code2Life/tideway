export function parseTopicHeader(rawTopics: string | null): string[] {
  if (rawTopics === null) {
    throw new Error('x-sse-topic header is required')
  }

  const parsed = rawTopics.split(',').map((topic) => topic.trim())
  if (parsed.length === 0 || parsed.some((topic) => topic.length === 0)) {
    throw new Error('x-sse-topic contains empty topic value')
  }

  const deduped: string[] = []
  const seen = new Set<string>()

  for (const topic of parsed) {
    if (!seen.has(topic)) {
      deduped.push(topic)
      seen.add(topic)
    }
  }

  return deduped
}
