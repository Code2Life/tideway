package main

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	gatewayURL := getenv("GATEWAY_URL", "http://127.0.0.1:8787")
	topic := getenv("TOPIC", "alerts")
	subscriberID := getenv("SUBSCRIBER_ID", "go-sub-1")

	request, err := http.NewRequest(http.MethodGet, gatewayURL+"/v1/stream", nil)
	if err != nil {
		panic(err)
	}

	request.Header.Set("x-sse-topic", topic)
	request.Header.Set("x-sse-id", subscriberID)

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		panic(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		panic(fmt.Sprintf("subscribe failed: %d", response.StatusCode))
	}

	scanner := bufio.NewScanner(response.Body)
	eventID := ""
	dataLines := make([]string, 0)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if eventID != "" && len(dataLines) > 0 {
				fmt.Printf("{\"id\":\"%s\",\"data\":\"%s\"}\n", eventID, strings.Join(dataLines, "\\n"))
				return
			}
			continue
		}

		if strings.HasPrefix(line, "id: ") {
			eventID = strings.TrimPrefix(line, "id: ")
			continue
		}

		if strings.HasPrefix(line, "data: ") {
			dataLines = append(dataLines, strings.TrimPrefix(line, "data: "))
		}
	}

	if err := scanner.Err(); err != nil {
		panic(err)
	}

	panic("stream closed without receiving event")
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
