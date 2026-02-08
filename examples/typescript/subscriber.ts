async function main() {
  const gatewayUrl = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8787'
  const topic = process.env.TOPIC ?? 'alerts'
  const subscriberId = process.env.SUBSCRIBER_ID ?? `ts-sub-${Date.now()}`

  const response = await fetch(`${gatewayUrl}/v1/stream`, {
    headers: {
      'x-sse-topic': topic,
      'x-sse-id': subscriberId,
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(`subscribe failed: ${response.status}`)
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    while (buffer.includes('\n\n')) {
      const splitAt = buffer.indexOf('\n\n')
      const rawEvent = buffer.slice(0, splitAt)
      buffer = buffer.slice(splitAt + 2)

      const lines = rawEvent.split('\n').filter((line) => line.length > 0)
      const eventId = lines.find((line) => line.startsWith('id: '))?.slice(4)
      const data = lines
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .join('\n')

      if (eventId && data.length > 0) {
        console.log(JSON.stringify({ id: eventId, data }))
        process.exit(0)
      }
    }
  }

  throw new Error('stream closed without receiving an event')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
