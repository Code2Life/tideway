const gatewayUrl = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8787'
const topic = process.env.TOPIC ?? 'alerts'
const subscriberId = process.env.SUBSCRIBER_ID ?? `ts-sub-${Date.now()}`

const response = await fetch(`${gatewayUrl}/v1/stream`, {
  headers: { 'x-sse-topic': topic, 'x-sse-id': subscriberId },
})

if (!response.ok || !response.body) {
  throw new Error(`subscribe failed: ${response.status}`)
}

let buffer = ''
let eventId = ''
let dataLines: string[] = []

for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
  buffer += chunk

  while (buffer.includes('\n\n')) {
    const boundary = buffer.indexOf('\n\n')
    const block = buffer.slice(0, boundary)
    buffer = buffer.slice(boundary + 2)

    for (const line of block.split('\n')) {
      if (line.startsWith('id: ')) eventId = line.slice(4)
      else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
    }

    if (eventId && dataLines.length > 0) {
      console.log(JSON.stringify({ id: eventId, data: dataLines.join('\n') }))
      process.exit(0)
    }

    eventId = ''
    dataLines = []
  }
}

throw new Error('stream closed without receiving an event')
