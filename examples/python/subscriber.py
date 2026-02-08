import json
import os
import urllib.request

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8787")
TOPIC = os.getenv("TOPIC", "alerts")
SUBSCRIBER_ID = os.getenv("SUBSCRIBER_ID", "py-sub-1")

request = urllib.request.Request(
    f"{GATEWAY_URL}/v1/stream",
    method="GET",
    headers={
        "x-sse-topic": TOPIC,
        "x-sse-id": SUBSCRIBER_ID,
    },
)

with urllib.request.urlopen(request, timeout=15) as response:
    event_id = None
    event_data: list[str] = []

    while True:
        raw_line = response.readline()
        if not raw_line:
            break

        line = raw_line.decode("utf-8").strip()
        if not line:
            if event_id and event_data:
                print(json.dumps({"id": event_id, "data": "\n".join(event_data)}))
                break
            event_id = None
            event_data.clear()
            continue

        if line.startswith("id: "):
            event_id = line[4:]
        elif line.startswith("data: "):
            event_data.append(line[6:])
