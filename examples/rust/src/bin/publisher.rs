use std::env;

fn getenv(key: &str, fallback: &str) -> String {
    env::var(key).unwrap_or_else(|_| fallback.to_string())
}

fn main() {
    let gateway_url = getenv("GATEWAY_URL", "http://127.0.0.1:8787");
    let topic = getenv("TOPIC", "alerts");
    let event_id = getenv("EVENT_ID", "rust-event-1");
    let api_key = getenv("API_KEY", "dev-key");
    let payload = getenv("PAYLOAD", "hello from rust publisher");

    let client = reqwest::blocking::Client::new();
    let response = client
        .post(format!("{}/v1/publish", gateway_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("x-sse-topic", topic)
        .header("x-sse-id", event_id)
        .body(payload)
        .send()
        .expect("publish request failed");

    let status = response.status();
    let body = response.text().expect("failed to read publish response");

    if status.as_u16() != 202 {
        panic!("publish failed: {} {}", status.as_u16(), body);
    }

    println!("{}", body);
}
