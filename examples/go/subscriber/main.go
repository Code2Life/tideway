package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	gateway := env("GATEWAY_URL", "http://127.0.0.1:8787")
	topic := env("TOPIC", "alerts")
	subID := env("SUBSCRIBER_ID", "go-sub-1")

	req, err := http.NewRequest(http.MethodGet, gateway+"/v1/stream", nil)
	if err != nil {
		panic(err)
	}
	req.Header.Set("x-sse-topic", topic)
	req.Header.Set("x-sse-id", subID)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		panic(fmt.Sprintf("subscribe failed: %d", resp.StatusCode))
	}

	scanner := bufio.NewScanner(resp.Body)
	var eventID string
	var dataLines []string

	for scanner.Scan() {
		line := scanner.Text()

		if line == "" {
			if eventID != "" && len(dataLines) > 0 {
				out, _ := json.Marshal(map[string]string{
					"id":   eventID,
					"data": strings.Join(dataLines, "\n"),
				})
				fmt.Println(string(out))
				return
			}
			eventID = ""
			dataLines = dataLines[:0]
			continue
		}

		switch {
		case strings.HasPrefix(line, "id: "):
			eventID = line[4:]
		case strings.HasPrefix(line, "data: "):
			dataLines = append(dataLines, line[6:])
		}
	}

	if err := scanner.Err(); err != nil {
		panic(err)
	}
	panic("stream closed without receiving event")
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
