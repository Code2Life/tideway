import os
import urllib.request

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8787")
TOPIC = os.getenv("TOPIC", "alerts")
EVENT_ID = os.getenv("EVENT_ID", "py-event-1")
API_KEY = os.getenv("API_KEY", "dev-key")
PAYLOAD = os.getenv("PAYLOAD", "hello from python publisher")

request = urllib.request.Request(
    f"{GATEWAY_URL}/v1/publish",
    method="POST",
    data=PAYLOAD.encode("utf-8"),
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "x-sse-topic": TOPIC,
        "x-sse-id": EVENT_ID,
    },
)

with urllib.request.urlopen(request, timeout=10) as response:
    body = response.read().decode("utf-8")
    if response.status != 202:
        raise RuntimeError(f"publish failed: {response.status} {body}")
    print(body)
