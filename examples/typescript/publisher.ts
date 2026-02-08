async function main() {
  const gatewayUrl = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8787'
  const topic = process.env.TOPIC ?? 'alerts'
  const eventId = process.env.EVENT_ID ?? `ts-event-${Date.now()}`
  const apiKey = process.env.API_KEY ?? 'dev-key'
  const payload = process.env.PAYLOAD ?? 'hello from typescript publisher'

  const response = await fetch(`${gatewayUrl}/v1/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'x-sse-topic': topic,
      'x-sse-id': eventId,
    },
    body: payload,
  })

  if (response.status !== 202) {
    throw new Error(`publish failed: ${response.status} ${await response.text()}`)
  }

  console.log(await response.text())
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
