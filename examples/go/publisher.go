package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	gatewayURL := getenv("GATEWAY_URL", "http://127.0.0.1:8787")
	topic := getenv("TOPIC", "alerts")
	eventID := getenv("EVENT_ID", "go-event-1")
	apiKey := getenv("API_KEY", "dev-key")
	payload := getenv("PAYLOAD", "hello from go publisher")

	request, err := http.NewRequest(http.MethodPost, gatewayURL+"/v1/publish", strings.NewReader(payload))
	if err != nil {
		panic(err)
	}

	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("x-sse-topic", topic)
	request.Header.Set("x-sse-id", eventID)

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		panic(err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		panic(err)
	}

	if response.StatusCode != http.StatusAccepted {
		panic(fmt.Sprintf("publish failed: %d %s", response.StatusCode, string(body)))
	}

	fmt.Println(string(body))
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
