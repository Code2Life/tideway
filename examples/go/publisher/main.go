package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	gateway := env("GATEWAY_URL", "http://127.0.0.1:8787")
	topic := env("TOPIC", "alerts")
	eventID := env("EVENT_ID", "go-event-1")
	apiKey := env("API_KEY", "dev-key")
	payload := env("PAYLOAD", "hello from go publisher")

	req, err := http.NewRequest(http.MethodPost, gateway+"/v1/publish", strings.NewReader(payload))
	if err != nil {
		panic(err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("x-sse-topic", topic)
	req.Header.Set("x-sse-id", eventID)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	if resp.StatusCode != http.StatusAccepted {
		panic(fmt.Sprintf("publish failed: %d %s", resp.StatusCode, body))
	}
	fmt.Println(string(body))
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
