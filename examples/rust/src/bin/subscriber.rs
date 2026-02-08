use std::env;
use std::io::{BufRead, BufReader};

fn getenv(key: &str, fallback: &str) -> String {
    env::var(key).unwrap_or_else(|_| fallback.to_string())
}

fn main() {
    let gateway_url = getenv("GATEWAY_URL", "http://127.0.0.1:8787");
    let topic = getenv("TOPIC", "alerts");
    let subscriber_id = getenv("SUBSCRIBER_ID", "rust-sub-1");

    let client = reqwest::blocking::Client::new();
    let response = client
        .get(format!("{}/v1/stream", gateway_url))
        .header("x-sse-topic", topic)
        .header("x-sse-id", subscriber_id)
        .send()
        .expect("subscribe request failed");

    if response.status().as_u16() != 200 {
        panic!("subscribe failed: {}", response.status().as_u16());
    }

    let mut reader = BufReader::new(response);
    let mut line = String::new();
    let mut event_id: Option<String> = None;
    let mut data_lines: Vec<String> = Vec::new();

    loop {
        line.clear();
        let bytes = reader
            .read_line(&mut line)
            .expect("failed to read stream line");
        if bytes == 0 {
            break;
        }

        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            if let Some(id) = &event_id {
                if !data_lines.is_empty() {
                    println!(
                        "{{\"id\":\"{}\",\"data\":\"{}\"}}",
                        id,
                        data_lines.join("\\n")
                    );
                    return;
                }
            }
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("id: ") {
            event_id = Some(rest.to_string());
            continue;
        }

        if let Some(rest) = trimmed.strip_prefix("data: ") {
            data_lines.push(rest.to_string());
        }
    }

    panic!("stream closed without receiving event");
}
